"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { computeDataset, ComputeError, type Dataset, type ParsedFile } from "@/lib/compute";

export default function UploadPage() {
  const router = useRouter();
  const bookingsRef = useRef<HTMLInputElement>(null);
  const providersRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState<"" | "bookings" | "providers">("");
  const [bookings, setBookings] = useState<ParsedFile | null>(null);
  const [providers, setProviders] = useState<ParsedFile | null>(null);
  const [data, setData] = useState<Dataset | null>(null);
  const [filename, setFilename] = useState("");
  const [label, setLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handlePick(which: "bookings" | "providers", fileList: FileList | null) {
    setErr(null);
    const f = fileList?.[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const pf: ParsedFile = { name: f.name, text: String(rd.result) };
      const nextBookings = which === "bookings" ? pf : bookings;
      const nextProviders = which === "providers" ? pf : providers;
      if (which === "bookings") setBookings(pf);
      else setProviders(pf);

      const files = [nextBookings, nextProviders].filter(Boolean) as ParsedFile[];
      if (!nextBookings) {
        setData(null);
        return; // providers alone can't be scored — wait for the bookings file
      }
      try {
        const ds = computeDataset(files);
        setData(ds);
        setFilename(files.map((x) => x.name).join(", "));
        if (!label) setLabel(nextBookings.name.replace(/\.csv$/i, ""));
      } catch (e) {
        setData(null);
        setErr(e instanceof ComputeError ? e.message : "Could not parse this file.");
      }
    };
    rd.readAsText(f);
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    setErr(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: row, error } = await supabase
      .from("uploads")
      .insert({
        user_id: user.id,
        email: user.email,
        label: label || filename,
        filename,
        period: data.totals.period,
        data,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    router.push(`/dashboard/${row!.id}`);
  }

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <h1>Upload a BookingKoala export</h1>
            <div className="sub">BookingKoala Bookings Export</div>
          </div>
        </div>
        <Link className="btn ghost" href="/dashboard">← All uploads</Link>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div
          className={"drop" + (over === "bookings" ? " over" : "")}
          style={bookings ? { borderColor: "var(--brand)", background: "#f0faf8" } : undefined}
          onClick={() => bookingsRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver("bookings"); }}
          onDragLeave={(e) => { e.preventDefault(); setOver(""); }}
          onDrop={(e) => { e.preventDefault(); setOver(""); handlePick("bookings", e.dataTransfer.files); }}
        >
          <span className="ic">{bookings ? "✅" : "1️⃣"}</span>
          <div>
            <b>{bookings ? bookings.name : "Bookings export"}</b>
            <br />
            <small>{bookings ? "Loaded — click to replace" : "Drop your Bookings CSV here, or click to choose"}</small>
          </div>
          <input ref={bookingsRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => handlePick("bookings", e.target.files)} />
        </div>
        <div
          className={"drop" + (over === "providers" ? " over" : "")}
          style={providers ? { borderColor: "var(--brand)", background: "#f0faf8" } : undefined}
          onClick={() => providersRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver("providers"); }}
          onDragLeave={(e) => { e.preventDefault(); setOver(""); }}
          onDrop={(e) => { e.preventDefault(); setOver(""); handlePick("providers", e.dataTransfer.files); }}
        >
          <span className="ic">{providers ? "✅" : "2️⃣"}</span>
          <div>
            <b>{providers ? providers.name : "Providers export"}</b>
            <br />
            <small>{providers ? "Loaded — click to replace" : "Drop your Providers CSV here — unlocks Churn %"}</small>
          </div>
          <input ref={providersRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => handlePick("providers", e.target.files)} />
        </div>
      </div>
      {providers && !bookings && (
        <div className="msg ok" style={{ maxWidth: 520 }}>Providers loaded — now add your Bookings export to score the team.</div>
      )}

      {err && <div className="msg err" style={{ maxWidth: 520 }}>{err}</div>}

      {!data && (
        <div className="steps" style={{ marginTop: 20 }}>
          <div className="step">
            <div className="stepnum">1</div>
            <div style={{ flex: 1 }}>
              <b>In BookingKoala, go to Bookings → Download CSV</b>
              <p>From the left menu, open <b>Bookings</b> and pick <b>Download CSV</b> near the bottom.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="bkimg" src="/bk-export/step1.png" alt="BookingKoala menu: Bookings → Download CSV" />
            </div>
          </div>
          <div className="step">
            <div className="stepnum">2</div>
            <div style={{ flex: 1 }}>
              <b>Pick your date range</b>
              <p>Use the calendar and choose <b>Last 90 Days</b> (or the period you want scored), then Apply.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="bkimg" src="/bk-export/step2.png" alt="BookingKoala export date range picker" />
            </div>
          </div>
          <div className="step">
            <div className="stepnum">3</div>
            <div style={{ flex: 1 }}>
              <b>Select all fields and export</b>
              <p>Under Field(s), tick <b>Select all</b> — that includes the provider/team column the scoring needs — then hit <b>Export</b>.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="bkimg" src="/bk-export/step3.png" alt="BookingKoala export: Select all fields, then Export" />
            </div>
          </div>
          <div className="step">
            <div className="stepnum">4</div>
            <div style={{ flex: 1 }}>
              <b>Also export your Providers list — this unlocks Churn %</b>
              <p>
                In BookingKoala go to <b>Providers → Export</b> and download the providers CSV.
              </p>
            </div>
          </div>
        </div>
      )}

      {data && (
        <>
          <div className="kpis">
            <div className="kpi"><div className="l">Cleaners</div><div className="v">{data.totals.cleaners}</div><div className="m">{data.totals.active_cleaners} active</div></div>
            <div className="kpi"><div className="l">Jobs</div><div className="v">{data.totals.jobs}</div><div className="m">this period</div></div>
            <div className="kpi"><div className="l">Revenue / mo</div><div className="v">${data.totals.rev_mo.toLocaleString()}</div><div className="m">run-rate</div></div>
            <div className="kpi"><div className="l">Recurring</div><div className="v">{data.totals.recurring_share}%</div><div className="m">of jobs</div></div>
            <div className="kpi"><div className="l">Credits</div><div className="v">${data.totals.credits.toLocaleString()}</div><div className="m">refunds + comps</div></div>
            <div className="kpi"><div className="l">Complaints</div><div className="v">{data.totals.total_complaints}</div><div className="m">sample</div></div>
          </div>

          <div className="card" style={{ maxWidth: 520, marginTop: 16 }}>
            <label className="field">
              <label>Name this upload</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. July 2026" />
            </label>
            <button className="btn dark" style={{ width: "100%" }} onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save & view dashboard"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
