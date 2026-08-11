// CSV parsing + scoring for a BookingKoala export. Runs in the browser on upload.
// Produces THREE shared layers every widget can read from one upload:
//   - cleaners: per-provider performance rollup (Cleaner Dashboard)
//   - clients:  per-customer rollup incl. contact + review signal (Review Chaser)
//   - bookings: lean per-booking rows (drill-downs, real complaint detection)
// The resulting Dataset is stored as JSON on the upload row.

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
  op_complaints: number; // REAL complaints attributed to this cleaner (was seeded)
  complaint_per_clean: number;
  avg_rating: number | null; // provider "Average" from the providers export
  provider_pay: number; // total paid to this cleaner (labor out)
  margin: number; // revenue − labor for their jobs
  labor_pct: number; // labor as % of the revenue they generated
  score: number;
  tier: "star" | "solid" | "watch" | "risk";
  rank: number;
};

// Margin by service type — the slice that shows deep/move cleans bleeding.
export type ServiceRow = {
  service: string;
  jobs: number;
  revenue: number;
  provider_pay: number;
  margin: number;
  margin_pct: number;
  labor_pct: number;
  avg_ticket: number;
};

// Complaint/margin rate by two-person team — "who shouldn't be paired."
export type PairRow = {
  pair: string;
  jobs: number;
  complaints: number;
  complaint_rate: number; // % of the pair's jobs with a complaint
  margin_pct: number;
};

// Per-customer rollup. Carries contact fields so Review Chaser can target
// happy clients and suppress unhappy ones straight from the upload.
export type ClientRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  neighborhood: string;
  frequency: string;
  occurrence: string; // "recurring" | "onetime"
  cadence_days: number | null;
  jobs: number;
  spend: number;
  owed: number; // outstanding balance on completed jobs (unpaid)
  first: string; // ISO date
  last: string; // ISO date
  days_since_last: number;
  overdue: boolean; // recurring client past their expected next visit
  best_rating: number | null;
  last_rating: number | null;
  last_comment: string;
  refunds: number;
  comps: number;
  had_complaint: boolean;
  review_ask: boolean; // happy + no complaint → good to ask for a review
  suppress: boolean; // complaint/refund/low rating → do NOT ask
  reactivation: boolean; // one-time client, no complaint → win back with a coupon
};

export type BookingRow = {
  id: string;
  date: string; // ISO date
  client: string;
  client_id: string;
  cleaners: string[];
  service: string;
  neighborhood: string;
  final: number;
  provider_pay: number;
  margin: number;
  refund: number;
  price_adj: number;
  adj_comment: string;
  discount: number;
  rating: number | null;
  rating_comment: string;
  occurrence: string;
  is_complaint: boolean;
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
  clients: number;
  discounts: number; // total given away this window
  unpaid_total: number; // outstanding balances across completed jobs
  unpaid_clients: number; // how many clients still owe
  overdue_clients: number;
  review_targets: number;
  reactivation_targets: number;
  window_days: number; // span of the export, for honest annualization
  provider_pay: number; // total labor out
  margin: number; // revenue − labor (gross, before overhead)
  margin_pct: number;
};

export type Dataset = {
  totals: Totals;
  cleaners: Cleaner[];
  clients: ClientRow[];
  bookings: BookingRow[];
  services: ServiceRow[];
  pairs: PairRow[];
};

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

// Rating cells are "0" or "" when unrated; treat those as "no rating".
const rating = (x: unknown): number | null => {
  const v = parseFloat(String(x ?? "").replace(/[,$]/g, ""));
  return isNaN(v) || v <= 0 ? null : v;
};

// Strip BookingKoala's ="10012" Excel-guard wrapper and stray quotes.
const clean = (x: unknown) => String(x ?? "").replace(/^="?|"?$/g, "").replace(/^"|"$/g, "").trim();

function pdt(s: string): Date | null {
  const m = String(s || "").match(/(\d{2})-(\d{2})-(\d{4})/);
  return m ? new Date(+m[3], +m[1] - 1, +m[2]) : null;
}
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

// Weekly → 7, Every 2 Weeks → 14, Every 4 Weeks → 28, Monthly → 30. Null = one-time.
function cadenceDays(frequency: string, occurrence: string): number | null {
  if (occurrence !== "recurring") return null;
  const f = frequency.toLowerCase();
  const m = f.match(/every\s+(\d+)\s+week/);
  if (m) return +m[1] * 7;
  if (f.includes("week")) return 7;
  if (f.includes("month")) return 30;
  return null;
}

// A booking is a complaint event if money was clawed back for a service reason,
// or the client rated it poorly. Keyword guard avoids counting neutral credits.
const COMPLAINT_RE = /complaint|re-?clean|redo|re-?do|late|unhappy|dissatisf|apolog|goodwill|missed|damage|poor|refund/i;
function isComplaint(refund: number, priceAdj: number, adjComment: string, rate: number | null): boolean {
  if (refund > 0) return true;
  if (priceAdj < 0 && COMPLAINT_RE.test(adjComment)) return true;
  if (rate != null && rate <= 3) return true;
  return false;
}

export class ComputeError extends Error {}

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

  const rowsB = book || [];
  let wend: Date | null = null;
  rowsB.forEach((r) => {
    const d = pdt(r["Date"]);
    if (d && (!wend || d > wend)) wend = d;
  });
  const wEnd: Date = wend ?? new Date();
  const DAY = 864e5;
  const wStart = new Date(+wEnd - 29 * DAY);

  // ---- Booking layer + per-cleaner / per-client aggregation in one pass ----
  type Agg = {
    name: string;
    jobs: number;
    revenue: number;
    pay: number;
    refunds: number;
    refund_ct: number;
    comps: number;
    comp_ct: number;
    rec: number;
    complaints: number;
    cust: Set<string>;
    first: Date | null;
  };
  const agg: Record<string, Agg> = {};

  type SAgg = { service: string; jobs: number; revenue: number; pay: number; complaints: number };
  const sagg: Record<string, SAgg> = {};
  type PAgg = { pair: string; jobs: number; revenue: number; pay: number; complaints: number };
  const pagg: Record<string, PAgg> = {};

  type CAgg = {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    neighborhood: string;
    frequency: string;
    occurrence: string;
    jobs: number;
    spend: number;
    owed: number;
    first: Date | null;
    last: Date | null;
    best_rating: number | null;
    last_rating: number | null;
    last_comment: string;
    refunds: number;
    comps: number;
    complaints: number;
  };
  const cagg: Record<string, CAgg> = {};
  const bookings: BookingRow[] = [];
  let discounts = 0;

  rowsB.forEach((r) => {
    const names = (r["Provider/team (without ids)"] || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const dt = pdt(r["Date"]);
    const final = N(r["Final amount (USD)"]);
    const pay = N(r["Provider/team payment (USD)"] || r["Provider payment (summary) (USD)"]);
    const margin = final - pay;
    const service = r["Service"] || "—";
    const refund = N(r["Refunded amount (USD)"]);
    const adj = N(r["Price adjustment"]);
    const adjComment = r["Price adjustment comment"] || "";
    const rate = rating(r["Rating value"]);
    const rateComment = r["Rating comment"] || "";
    const occurrence = r["Occurrence"] || "";
    const neighborhood = r["Location"] || r["City"] || "";
    const discount = N(r["Discount amount (USD)"]);
    const owed = N(r["Amount owed by customer (USD)"]);
    const complaintEvent = isComplaint(refund, adj, adjComment, rate);
    discounts += discount;

    bookings.push({
      id: r["Booking id"] || r["Transaction id"] || "",
      date: iso(dt),
      client: r["Full name"] || `${r["First name"] || ""} ${r["Last name"] || ""}`.trim(),
      client_id: r["Customer id"] || r["Client id"] || r["Email"] || "",
      cleaners: names,
      service: r["Service"] || "",
      neighborhood,
      final: Math.round(final * 100) / 100,
      provider_pay: Math.round(pay * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      refund: Math.round(refund * 100) / 100,
      price_adj: adj,
      adj_comment: adjComment,
      discount: Math.round(discount * 100) / 100,
      rating: rate,
      rating_comment: rateComment,
      occurrence,
      is_complaint: complaintEvent,
    });

    // ---- Client aggregation ----
    const cid = r["Customer id"] || r["Client id"] || r["Email"] || r["Full name"] || "unknown";
    const c =
      cagg[cid] ||
      (cagg[cid] = {
        id: cid,
        name: r["Full name"] || `${r["First name"] || ""} ${r["Last name"] || ""}`.trim(),
        email: r["Email"] || "",
        phone: clean(r["Phone"]),
        address: r["Address"] || "",
        neighborhood,
        frequency: r["Frequency"] || "",
        occurrence,
        jobs: 0,
        spend: 0,
        owed: 0,
        first: null,
        last: null,
        best_rating: null,
        last_rating: null,
        last_comment: "",
        refunds: 0,
        comps: 0,
        complaints: 0,
      });
    c.jobs++;
    c.spend += final;
    c.owed += owed;
    c.refunds += refund;
    if (adj < 0) c.comps += -adj;
    if (complaintEvent) c.complaints++;
    if (rate != null && (c.best_rating == null || rate > c.best_rating)) c.best_rating = rate;
    if (dt && (!c.first || dt < c.first)) c.first = dt;
    if (dt && (!c.last || dt > c.last)) {
      c.last = dt;
      c.last_rating = rate;
      c.last_comment = rateComment;
      c.frequency = r["Frequency"] || c.frequency;
      c.occurrence = occurrence || c.occurrence;
      c.neighborhood = neighborhood || c.neighborhood;
    }

    // ---- Service-type aggregation (margin by service) ----
    const s = sagg[service] || (sagg[service] = { service, jobs: 0, revenue: 0, pay: 0, complaints: 0 });
    s.jobs++;
    s.revenue += final;
    s.pay += pay;
    if (complaintEvent) s.complaints++;

    // ---- Cleaner aggregation (split shared jobs evenly) ----
    if (!names.length) return;
    const k = names.length;

    // ---- Pair aggregation (only when 2+ cleaners share the job) ----
    if (names.length >= 2) {
      const key = [...names].sort().join(" + ");
      const pr = pagg[key] || (pagg[key] = { pair: key, jobs: 0, revenue: 0, pay: 0, complaints: 0 });
      pr.jobs++;
      pr.revenue += final;
      pr.pay += pay;
      if (complaintEvent) pr.complaints++;
    }

    names.forEach((n) => {
      const a =
        agg[n] ||
        (agg[n] = {
          name: n,
          jobs: 0,
          revenue: 0,
          pay: 0,
          refunds: 0,
          refund_ct: 0,
          comps: 0,
          comp_ct: 0,
          rec: 0,
          complaints: 0,
          cust: new Set<string>(),
          first: null,
        });
      a.jobs++;
      a.revenue += final / k;
      a.pay += pay / k;
      a.refunds += refund;
      if (refund > 0) a.refund_ct++;
      if (adj < 0) {
        a.comps += -adj / k;
        a.comp_ct++;
      }
      if (complaintEvent) a.complaints++;
      if (occurrence === "recurring") a.rec++;
      if (r["Customer id"]) a.cust.add(r["Customer id"]);
      if (dt && (!a.first || dt < a.first)) a.first = dt;
    });
  });

  // ---- Providers export: status, lifetime bookings/cancellations, rating avg ----
  const provMap: Record<string, Record<string, string>> = {};
  (prov || []).forEach((p) => {
    const nm = (p["Full Name"] || "").trim();
    if (nm) provMap[nm] = p;
  });

  let cleanerList = Object.values(agg)
    .filter((a) => a.jobs >= 3)
    .map((a) => {
      const p = provMap[a.name] || {};
      const tot = N(p["Number Of Bookings"]);
      const canc = N(p["Number Of Cancelled Bookings"]);
      const first = a.first || wStart;
      const days = Math.max(Math.round((+wEnd - +first) / DAY), 7);
      const credits = a.refunds + a.comps;
      const avg = N(p["Average"]);
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
        op_complaints: a.complaints,
        complaint_per_clean: Math.round((1000 * a.complaints) / a.jobs) / 1000,
        avg_rating: avg > 0 ? avg : null,
        provider_pay: Math.round(a.pay),
        margin: Math.round(a.revenue - a.pay),
        labor_pct: a.revenue > 0 ? Math.round((100 * a.pay) / a.revenue) : 0,
      } as Cleaner;
    });

  if (!cleanerList.length)
    throw new ComputeError("Parsed the file, but found no cleaner with 3+ jobs to score.");

  const norm = (key: keyof Cleaner, inv: boolean) => {
    const vs = cleanerList.map((c) => c[key] as number);
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
  cleanerList.forEach((c) => {
    c.score = Math.round(10 * (0.4 * nC(c) + 0.25 * nX(c) + 0.25 * nCr(c) + 0.1 * nRec(c))) / 10;
    c.tier = c.score >= 75 ? "star" : c.score >= 50 ? "solid" : c.score >= 30 ? "watch" : "risk";
  });
  cleanerList.sort((a, b) => b.score - a.score).forEach((c, i) => (c.rank = i + 1));

  // ---- Finalize client layer (cadence / overdue / review targeting) ----
  const clients: ClientRow[] = Object.values(cagg).map((c) => {
    const cad = cadenceDays(c.frequency, c.occurrence);
    const last = c.last || wStart;
    const daysSince = Math.round((+wEnd - +last) / DAY);
    const overdue = cad != null && daysSince > cad * 1.5;
    const suppress = c.complaints > 0 || c.refunds > 0 || (c.last_rating != null && c.last_rating <= 3);
    // Ask happy clients: a 4–5★ somewhere, at least one clean, and nothing gone wrong.
    const review_ask = !suppress && (c.best_rating ?? 0) >= 4 && c.jobs >= 1;
    // Reactivation: one-time clients who never went recurring — win back with a coupon.
    const reactivation = c.occurrence !== "recurring" && !suppress && daysSince >= 14;
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      neighborhood: c.neighborhood,
      frequency: c.frequency,
      occurrence: c.occurrence,
      cadence_days: cad,
      jobs: c.jobs,
      spend: Math.round(c.spend),
      owed: Math.round(c.owed * 100) / 100,
      first: iso(c.first),
      last: iso(c.last),
      days_since_last: daysSince,
      overdue,
      best_rating: c.best_rating,
      last_rating: c.last_rating,
      last_comment: c.last_comment,
      refunds: Math.round(c.refunds * 100) / 100,
      comps: Math.round(c.comps * 100) / 100,
      had_complaint: c.complaints > 0,
      review_ask,
      suppress,
      reactivation,
    };
  });
  clients.sort((a, b) => b.spend - a.spend);

  // ---- Margin by service type ----
  const services: ServiceRow[] = Object.values(sagg)
    .map((s) => {
      const margin = s.revenue - s.pay;
      return {
        service: s.service,
        jobs: s.jobs,
        revenue: Math.round(s.revenue),
        provider_pay: Math.round(s.pay),
        margin: Math.round(margin),
        margin_pct: s.revenue > 0 ? Math.round((100 * margin) / s.revenue) : 0,
        labor_pct: s.revenue > 0 ? Math.round((100 * s.pay) / s.revenue) : 0,
        avg_ticket: s.jobs ? Math.round(s.revenue / s.jobs) : 0,
      };
    })
    .sort((a, b) => a.margin_pct - b.margin_pct); // worst margin first

  // ---- Complaint/margin rate by two-person pairing ----
  const pairs: PairRow[] = Object.values(pagg)
    .map((p) => {
      const margin = p.revenue - p.pay;
      return {
        pair: p.pair,
        jobs: p.jobs,
        complaints: p.complaints,
        complaint_rate: p.jobs ? Math.round((100 * p.complaints) / p.jobs) : 0,
        margin_pct: p.revenue > 0 ? Math.round((100 * margin) / p.revenue) : 0,
      };
    })
    .sort((a, b) => b.complaint_rate - a.complaint_rate || b.jobs - a.jobs);

  const bookDates = bookings.map((b) => b.date).filter(Boolean).sort();
  const windowDays =
    bookDates.length >= 2
      ? Math.max(1, Math.round((+new Date(bookDates[bookDates.length - 1]) - +new Date(bookDates[0])) / DAY))
      : 30;

  const tj = cleanerList.reduce((s, c) => s + c.jobs, 0);
  const totals: Totals = {
    period: book && book.length ? "Uploaded export" : "Providers export",
    jobs: tj,
    revenue: Math.round(cleanerList.reduce((s, c) => s + c.revenue, 0)),
    rev_mo: Math.round(cleanerList.reduce((s, c) => s + c.rev_mo, 0)),
    credits: Math.round(cleanerList.reduce((s, c) => s + c.credits, 0) * 100) / 100,
    cleaners: cleanerList.length,
    active_cleaners: cleanerList.filter((c) => c.Status === "Active").length,
    total_complaints: bookings.filter((b) => b.is_complaint).length,
    recurring_share: Math.round(
      cleanerList.reduce((s, c) => s + c.recurring_pct * c.jobs, 0) / Math.max(1, tj),
    ),
    clients: clients.length,
    discounts: Math.round(discounts),
    unpaid_total: Math.round(clients.reduce((s, c) => s + c.owed, 0)),
    unpaid_clients: clients.filter((c) => c.owed > 0).length,
    overdue_clients: clients.filter((c) => c.overdue).length,
    review_targets: clients.filter((c) => c.review_ask).length,
    reactivation_targets: clients.filter((c) => c.reactivation).length,
    window_days: windowDays,
    provider_pay: Math.round(bookings.reduce((s, b) => s + b.provider_pay, 0)),
    margin: Math.round(bookings.reduce((s, b) => s + b.margin, 0)),
    margin_pct: (() => {
      const rev = bookings.reduce((s, b) => s + b.final, 0);
      const pay = bookings.reduce((s, b) => s + b.provider_pay, 0);
      return rev > 0 ? Math.round((100 * (rev - pay)) / rev) : 0;
    })(),
  };

  return { totals, cleaners: cleanerList, clients, bookings, services, pairs };
}
