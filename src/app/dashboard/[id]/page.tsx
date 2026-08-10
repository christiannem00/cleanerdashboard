import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Dashboard from "@/components/Dashboard";
import type { Dataset } from "@/lib/compute";

export const dynamic = "force-dynamic";

export default async function DashboardView({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: upload } = await supabase
    .from("uploads")
    .select("id, label, filename, period, data, created_at")
    .eq("id", params.id)
    .single();

  if (!upload) notFound();
  const data = upload.data as Dataset;

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <h1>Cleaner Performance Dashboard</h1>
            <div className="sub">{upload.label || upload.filename || "Upload"} · powered by Sergio</div>
          </div>
        </div>
        <div className="topright">
          <span className="periodpill">{data.totals?.period || upload.period || "—"}</span>
          <Link className="btn ghost" href="/dashboard">← All uploads</Link>
        </div>
      </header>

      <div className="insight">
        <h3>Your real quality signal is the phone line, not the star rating.</h3>
        <p>BookingKoala star ratings are internal-only vanity — every active cleaner sits at 4.9–5.0. So ratings are excluded here. What tells you who&apos;s slacking is what clients say when something&apos;s wrong: they call or text. The <b>Complaints / Clean</b> column is where OpenPhone/Quo plugs in — currently in limited beta.</p>
      </div>

      <Dashboard data={data} uploadId={upload.id} />

      <footer>
        Stored from your BookingKoala export. Star ratings excluded (internal vanity, not Google reviews). Revenue is a 30-day run-rate.<br />
        Sergio — AI back office for cleaning companies.
      </footer>
    </div>
  );
}
