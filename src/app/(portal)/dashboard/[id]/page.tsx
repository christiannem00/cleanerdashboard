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
          <Link className="btn ghost" href="/dashboard">← All uploads</Link>
        </div>
      </header>

      <Dashboard data={data} uploadId={upload.id} />

      <footer>
        Sergio — AI back office for cleaning companies.
      </footer>
    </div>
  );
}
