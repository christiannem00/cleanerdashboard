import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WaitlistCta from "@/components/WaitlistCta";

export const dynamic = "force-dynamic";

export default async function DashboardList() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: uploads } = await supabase
    .from("uploads")
    .select("id, label, filename, period, created_at, data")
    .order("created_at", { ascending: false });

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <h1>Cleaner Performance Dashboard</h1>
            <div className="sub">Upload a BookingKoala export · powered by Sergio</div>
          </div>
        </div>
        <div className="topright">
          <span className="who">{user.email}</span>
          <Link className="btn" href="/upload">+ New upload</Link>
        </div>
      </header>

      {uploads && uploads.length > 0 ? (
        <div className="uploads">
          {uploads.map((u: any) => {
            const totals = u.data?.totals || {};
            return (
              <Link key={u.id} href={`/dashboard/${u.id}`} className="uprow">
                <div className="meta">
                  <b>{u.label || u.filename || "Upload"}</b>
                  <br />
                  <small>
                    {new Date(u.created_at).toLocaleString()} · {totals.cleaners ?? "—"} cleaners · {totals.jobs ?? "—"} jobs
                    {totals.rev_mo ? ` · $${Number(totals.rev_mo).toLocaleString()}/mo` : ""}
                  </small>
                </div>
                <span className="btn ghost">View →</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <p>No uploads yet.</p>
          <Link className="btn" href="/upload">Upload your first BookingKoala CSV</Link>
        </div>
      )}

      <WaitlistCta defaultEmail={user.email ?? ""} />
    </div>
  );
}
