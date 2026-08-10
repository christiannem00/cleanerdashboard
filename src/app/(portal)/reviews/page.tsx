import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReviewChaserEmbed from "@/components/ReviewChaserEmbed";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <ReviewChaserEmbed email={user.email ?? ""} />;
}
