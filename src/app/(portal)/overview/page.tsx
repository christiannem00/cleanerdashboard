import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Overview from "@/components/Overview";
import type { Dataset } from "@/lib/compute";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: uploads } = await supabase
    .from("uploads")
    .select("id, data, created_at")
    .order("created_at", { ascending: false })
    .limit(1);

  // Same onboarding gate: the overview is built from an uploaded export.
  const latest = uploads?.[0];
  if (!latest) redirect("/upload?first=1");

  return <Overview data={latest.data as Dataset} />;
}
