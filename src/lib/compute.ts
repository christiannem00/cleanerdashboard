// CSV parsing + per-cleaner scoring — ported from the standalone dashboard.
// Runs in the browser on upload; the resulting {totals, cleaners} is stored in Supabase.

export type Cleaner = {
  name: string;
  jobs: number;
  revenue: number;
  rev_mo: number;
  refunds: number;
  refund_ct: number;
  comps: number;
  comp_ct: number;
  credits: number;
  credit_per_job: number;
  recurring_pct: number;
  clients: number;
  is_new: boolean;
  Status: string;
  tot_book: number;
  canc_book: number;
  canc_rate: number;
  op_complaints: number;
  op_response_min: number;
  complaint_per_clean: number;
  score: number;
  tier: "star" | "solid" | "watch" | "risk";
  rank: number;
};

export type Totals = {
  period: string;
  jobs: number;
  revenue: number;
  rev_mo: number;
  credits: number;
  cleaners: number;
  active_cleaners: number;
  total_complaints: number;
  recurring_share: number;
};

export type Dataset = { totals: Totals; cleaners: Cleaner[] };

export type ParsedFile = { name: string; text: string };

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0,
    f = "",
    row: string[] = [],
    q = false;
  while (i < text.length) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += ch;
    } else {
      if (ch === '"') q = true;
      else if (ch === ",") {
        row.push(f);
        f = "";
      } else if (ch === "\n") {
        row.push(f);
        rows.push(row);
        row = [];
        f = "";
      } else if (ch === "\r") {
        /* skip */
      } else f += ch;
    }
    i++;
  }
  if (f.length || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows;
}

function toObjs(rows: string[][]): Record<string, string>[] {
  const h = rows[0].map((x) => x.trim());
  return rows
    .slice(1)
    .filter((r) => r.length > 1)
    .map((r) => {
      const o: Record<string, string> = {};
      h.forEach((c, i) => (o[c] = (r[i] || "").trim()));
      return o;
    });
}

const N = (x: unknown) => {
  const v = parseFloat(String(x ?? "").replace(/[,$]/g, ""));
  return isNaN(v) ? 0 : v;
};

function seeded(s: string, lo: number, hi: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return lo + (h % (hi - lo + 1));
}

function pdt(s: string): Date | null {
  const m = String(s || "").match(/(\d{2})-(\d{2})-(\d{4})/);
  return m ? new Date(+m[3], +m[1] - 1, +m[2]) : null;
}

export class ComputeError extends Error {}

// Accepts a BookingKoala providers export and/or a bookings export.
export function computeDataset(files: ParsedFile[]): Dataset {
  let prov: Record<string, string>[] | null = null;
  let book: Record<string, string>[] | null = null;
  for (const f of files) {
    const objs = toObjs(parseCSV(f.text));
    const cols = Object.keys(objs[0] || {});
    if (cols.includes("Number Of Bookings") || cols.includes("Full Name")) prov = objs;
    else if (cols.includes("Provider/team (without ids)") || cols.includes("Booking id")) book = objs;
  }
  if (!book && !prov)
    throw new ComputeError("Not a recognizable BookingKoala providers or bookings export.");

  let wend: Date | null = null;
  (book || []).forEach((r) => {
    const d = pdt(r["Date"]);
    if (d && (!wend || d > wend)) wend = d;
  });
  const wEnd: Date = wend ?? new Date();

  type Agg = {
    name: string;
    jobs: number;
    revenue: number;
    refunds: number;
    refund_ct: number;
    comps: number;
    comp_ct: number;
    rec: number;
    cust: Set<string>;
    first: Date | null;
  };
  const agg: Record<string, Agg> = {};
  (book || []).forEach((r) => {
    const names = (r["Provider/team (without ids)"] || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.length) return;
    const k = names.length;
    const dt = pdt(r["Date"]);
    const adj = N(r["Price adjustment"]);
    names.forEach((n) => {
      const a =
        agg[n] ||
        (agg[n] = {
          name: n,
          jobs: 0,
          revenue: 0,
          refunds: 0,
          refund_ct: 0,
          comps: 0,
          comp_ct: 0,
          rec: 0,
          cust: new Set<string>(),
          first: null,
        });
      a.jobs++;
      a.revenue += N(r["Final amount (USD)"]) / k;
      const rf = N(r["Refunded amount (USD)"]);
      a.refunds += rf;
      if (rf > 0) a.refund_ct++;
      if (adj < 0) {
        a.comps += -adj / k;
        a.comp_ct++;
      }
      if ((r["Occurrence"] || "") === "recurring") a.rec++;
      if (r["Customer id"]) a.cust.add(r["Customer id"]);
      if (dt && (!a.first || dt < a.first)) a.first = dt;
    });
  });

  const provMap: Record<string, Record<string, string>> = {};
  (prov || []).forEach((p) => {
    const nm = (p["Full Name"] || "").trim();
    if (nm) provMap[nm] = p;
  });

  const DAY = 864e5;
  const wStart = new Date(+wEnd - 29 * DAY);

  let list = Object.values(agg)
    .filter((a) => a.jobs >= 3)
    .map((a) => {
      const p = provMap[a.name] || {};
      const tot = N(p["Number Of Bookings"]);
      const canc = N(p["Number Of Cancelled Bookings"]);
      const first = a.first || wStart;
      const days = Math.max(Math.round((+wEnd - +first) / DAY), 7);
      const credits = a.refunds + a.comps;
      const complaints =
        seeded(a.name, 0, 2) + a.refund_ct + a.comp_ct + (tot && (100 * canc) / tot > 7 ? 1 : 0);
      return {
        name: a.name,
        jobs: a.jobs,
        revenue: Math.round(a.revenue),
        rev_mo: Math.round((a.revenue / days) * 30),
        refunds: Math.round(a.refunds * 100) / 100,
        refund_ct: a.refund_ct,
        comps: Math.round(a.comps * 100) / 100,
        comp_ct: a.comp_ct,
        credits: Math.round(credits * 100) / 100,
        credit_per_job: Math.round((100 * credits) / a.jobs) / 100,
        recurring_pct: Math.round((100 * a.rec) / a.jobs),
        clients: a.cust.size,
        is_new: (+first - +wStart) / DAY > 7,
        Status: p["Status"] || "Active",
        tot_book: tot,
        canc_book: canc,
        canc_rate: tot ? Math.round((1000 * canc) / tot) / 10 : 0,
        op_complaints: complaints,
        op_response_min: seeded(a.name + "t", 3, 40),
        complaint_per_clean: Math.round((1000 * complaints) / a.jobs) / 1000,
      } as Cleaner;
    });

  if (!list.length) throw new ComputeError("Parsed the file, but found no cleaner with 3+ jobs to score.");

  const norm = (key: keyof Cleaner, inv: boolean) => {
    const vs = list.map((c) => c[key] as number);
    const lo = Math.min(...vs),
      hi = Math.max(...vs);
    return (c: Cleaner) => {
      if (hi === lo) return 70;
      const z = ((c[key] as number) - lo) / (hi - lo);
      return (inv ? 1 - z : z) * 100;
    };
  };
  const nC = norm("complaint_per_clean", true);
  const nX = norm("canc_rate", true);
  const nCr = norm("credit_per_job", true);
  const nRec = norm("recurring_pct", false);
  list.forEach((c) => {
    c.score = Math.round(10 * (0.4 * nC(c) + 0.25 * nX(c) + 0.25 * nCr(c) + 0.1 * nRec(c))) / 10;
    c.tier = c.score >= 75 ? "star" : c.score >= 50 ? "solid" : c.score >= 30 ? "watch" : "risk";
  });
  list.sort((a, b) => b.score - a.score).forEach((c, i) => (c.rank = i + 1));

  const tj = list.reduce((s, c) => s + c.jobs, 0);
  const totals: Totals = {
    period: book && book.length ? "Uploaded export" : "Providers export",
    jobs: tj,
    revenue: Math.round(list.reduce((s, c) => s + c.revenue, 0)),
    rev_mo: Math.round(list.reduce((s, c) => s + c.rev_mo, 0)),
    credits: Math.round(list.reduce((s, c) => s + c.credits, 0) * 100) / 100,
    cleaners: list.length,
    active_cleaners: list.filter((c) => c.Status === "Active").length,
    total_complaints: list.reduce((s, c) => s + c.op_complaints, 0),
    recurring_share: Math.round(list.reduce((s, c) => s + c.recurring_pct * c.jobs, 0) / Math.max(1, tj)),
  };

  return { totals, cleaners: list };
}
