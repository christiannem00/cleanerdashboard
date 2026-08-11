import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReviewChaserEmbed, { type PickClient } from "@/components/ReviewChaserEmbed";
import type { Dataset } from "@/lib/compute";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Review Chaser is unlocked once the operator has uploaded — the shared source
  // of truth every widget reads from.
  const { data: uploads } = await supabase
    .from("uploads")
    .select("data")
    .order("created_at", { ascending: false })
    .limit(1);
  const latest = uploads?.[0];
  if (!latest) redirect("/upload?first=1");

  const data = latest.data as Dataset;

  // Build the "who should we add?" candidate list: one row per client that has a
  // phone, tagged with their most recent completed job (the booking ReviewChaser
  // schedules the ask against) and whether we'd recommend chasing them.
  const latestBooking: Record<string, { id: string; date: string }> = {};
  for (const b of data.bookings || []) {
    if (!b.client_id || !b.id) continue;
    const cur = latestBooking[b.client_id];
    if (!cur || b.date > cur.date) latestBooking[b.client_id] = { id: b.id, date: b.date };
  }
  const candidates: PickClient[] = (data.clients || [])
    .filter((c) => c.phone && latestBooking[c.id])
    .map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      ref: latestBooking[c.id].id,
      date: latestBooking[c.id].date,
      last: c.last,
      rating: c.best_rating,
      suppress: c.suppress,
      recommended: c.review_ask || (!c.suppress && (c.best_rating ?? 0) === 0),
    }))
    .sort((a, b) => Number(b.recommended) - Number(a.recommended) || (a.suppress ? 1 : 0) - (b.suppress ? 1 : 0));

  return <ReviewChaserEmbed candidates={candidates} />;
}
