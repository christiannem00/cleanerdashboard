"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin";
import { createRcClient } from "@/lib/rc/client";
import { composeSms } from "@/lib/rc/compose";
import { nextSendAt } from "@/lib/rc/schedule";

// Every action re-checks admin (server actions are public endpoints).
async function guard() {
  await requireAdmin();
  return createRcClient();
}

// "Mark sent" — advance the reminder schedule and log the outbound text so the
// operator sees it in their dashboard thread.
export async function markSent(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  const db = await guard();
  const { data: r } = await db
    .from("rf_requests")
    .select("*, operators(business_name,email)")
    .eq("id", id)
    .maybeSingle();
  if (!r) return;
  const business = (r as any).operators?.business_name || "your cleaner";
  const text = composeSms(r as any, business);
  const newStep = (r as any).step + 1;
  await db
    .from("rf_requests")
    .update({
      status: "sent",
      step: newStep,
      last_sent_at: new Date().toISOString(),
      next_send_at: nextSendAt((r as any).completed_at || (r as any).created_at, newStep),
    })
    .eq("id", (r as any).id);
  await db.from("rf_messages").insert({
    operator_id: (r as any).operator_id,
    booking_ref: (r as any).booking_ref,
    customer_name: (r as any).to_name,
    direction: "out",
    body: text,
  });
  revalidatePath("/admin/sms-queue");
}

// "⭐ Review Successful" — the customer left the Google review.
export async function markReviewed(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  const db = await guard();
  const { data: r } = await db
    .from("rf_requests")
    .select("id, operator_id, booking_ref, to_name")
    .eq("id", id)
    .maybeSingle();
  if (!r) return;
  await db
    .from("rf_requests")
    .update({
      status: "responded_positive",
      sentiment: "positive",
      responded_at: new Date().toISOString(),
      next_send_at: null,
    })
    .eq("id", (r as any).id);
  await db.from("rf_messages").insert({
    operator_id: (r as any).operator_id,
    booking_ref: (r as any).booking_ref,
    customer_name: (r as any).to_name,
    direction: "in",
    body: "⭐ Left a Google review!",
  });
  revalidatePath("/admin/sms-queue");
}

// "Stop follow-ups" — end the sequence for that customer.
export async function stopFollowups(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  const db = await guard();
  await db
    .from("rf_requests")
    .update({ status: "stopped", next_send_at: null })
    .eq("id", id);
  revalidatePath("/admin/sms-queue");
}

// "Log reply" — paste what the customer texted back (Google Voice).
export async function logReply(formData: FormData) {
  const id = String(formData.get("id") || "");
  const reply = String(formData.get("reply") || "").trim().slice(0, 2000);
  if (!id || !reply) return;
  const db = await guard();
  const { data: r } = await db
    .from("rf_requests")
    .select("operator_id, booking_ref, to_name")
    .eq("id", id)
    .maybeSingle();
  if (!r) return;
  await db.from("rf_messages").insert({
    operator_id: (r as any).operator_id,
    booking_ref: (r as any).booking_ref,
    customer_name: (r as any).to_name,
    direction: "in",
    body: reply,
  });
  revalidatePath("/admin/sms-queue");
}

// Operator-composed custom draft → mark it sent.
export async function draftMarkSent(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  const db = await guard();
  await db
    .from("rf_messages")
    .update({ direction: "sent_custom", created_at: new Date().toISOString() })
    .eq("id", id)
    .eq("direction", "draft");
  revalidatePath("/admin/sms-queue");
}

// Operator-composed custom draft → discard.
export async function draftDiscard(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  const db = await guard();
  await db
    .from("rf_messages")
    .update({ direction: "discarded" })
    .eq("id", id)
    .eq("direction", "draft");
  revalidatePath("/admin/sms-queue");
}
