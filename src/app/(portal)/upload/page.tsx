"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { computeDataset, ComputeError, type Dataset, type ParsedFile } from "@/lib/compute";

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [data, setData] = useState<Dataset | null>(null);
  const [filename, setFilename] = useState("");
  const [label, setLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleFiles(fileList: FileList | null) {
    setErr(null);
    const arr = Array.from(fileList || []);
    if (!arr.length) return;
    let done = 0;
    const out: ParsedFile[] = [];
    arr.forEach((f) => {
      const rd = new FileReader();
      rd.onload = () => {
        out.push({ name: f.name, text: String(rd.result) });
        if (++done === arr.length) {
          try {
            const ds = computeDataset(out);
            setData(ds);
            setFilename(arr.map((x) => x.name).join(", "));
            if (!label) setLabel(arr[0].name.replace(/\.csv$/i, ""));
          } catch (e) {
            setData(null);
            setErr(e instanceof ComputeError ? e.message : "Could not parse this file.");
          }
        }
      };
      rd.readAsText(f);
    });
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

      <div
        className={"drop" + (over ? " over" : "")}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setOver(false); }}
        onDrop={(e) => { e.preventDefault(); setOver(false); handleFiles(e.dataTransfer.files); }}
      >
        <span className="ic">📥</span>
        <div>
          <b>Drop your CSV here, or click to choose</b>
          <br />
          <small>You can drop the providers and bookings exports together. Nothing is uploaded until you hit Save.</small>
        </div>
        <input ref={fileRef} type="file" accept=".csv" multiple style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
      </div>

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
              <p>Under Field(s), tick <b>Select all</b> — that includes the provider/team column the scoring needs — then hit <b>Export</b> and drop the downloaded CSV above.</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="bkimg" src="/bk-export/step3.png" alt="BookingKoala export: Select all fields, then Export" />
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
