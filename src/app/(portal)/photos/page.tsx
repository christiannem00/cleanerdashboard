import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhotoManagement from "@/components/PhotoManagement";

export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: settings } = await supabase
    .from("photo_settings")
    .select("showcase_url")
    .eq("user_id", user.id)
    .maybeSingle();

  return <PhotoManagement initialUrl={settings?.showcase_url ?? ""} userId={user.id} />;
}
