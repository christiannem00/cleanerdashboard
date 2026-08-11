import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReviewChaserEmbed from "@/components/ReviewChaserEmbed";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Same onboarding gate as the dashboard: Review Chaser is unlocked once the
  // operator has uploaded their BookingKoala export. It's the shared source of
  // truth every widget reads from.
  const { count } = await supabase
    .from("uploads")
    .select("id", { count: "exact", head: true });
  if (!count) redirect("/upload?first=1");

  return <ReviewChaserEmbed />;
}
