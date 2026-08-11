// POST /api/rc/import — push the onboarding upload's customers into Review Chaser.
// The portal user is mapped to their ReviewChaser operator by verified email (created
// on the fly if needed), then the raw BookingKoala CSV is handed to ReviewChaser's own
// /api/import-csv with an operator-scoped session cookie. RC's importer builds the
// contacts + review requests and dedups on (operator_id, booking_ref), so re-syncing the
// same upload is safe. `refs` limits the import to the jobs we want chased (we exclude
// complaints / suppressed clients on the Sergio side before sending).
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RC_COOKIE, rcConfigured, rcOperatorByEmail, rcCreateOperator, signRcSession } from "@/lib/rc";

export const dynamic = "force-dynamic";

const RC_ORIGIN = (process.env.RC_APP_ORIGIN || "https://reviewchaser.vercel.app").replace(/\/$/, "");

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (!rcConfigured()) return NextResponse.json({ skipped: "rc not configured" });

  type Contact = { ref?: string; name?: string; email?: string; phone?: string; date?: string };
  let body: { csv?: string; refs?: unknown; contacts?: Contact[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  // Two entry points: a raw CSV (from the upload flow) or a structured contact
  // list picked in the Review Chaser prompt. For contacts we synthesize the CSV
  // ReviewChaser's importer expects, so all the dedup/scheduling logic is reused.
  let csv = typeof body.csv === "string" ? body.csv : "";
  let only = Array.isArray(body.refs) ? body.refs.slice(0, 5000).map((x) => String(x)).filter(Boolean) : undefined;

  if (!csv && Array.isArray(body.contacts) && body.contacts.length) {
    const cell = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const picked = body.contacts.slice(0, 5000).filter((c) => c.ref && c.phone);
    const header = ["Booking id", "Date", "Full name", "Email", "Phone", "Booking status"];
    const lines = [header.join(",")];
    for (const c of picked) lines.push([c.ref, c.date || "", c.name || "", c.email || "", c.phone, "completed"].map(cell).join(","));
    csv = lines.join("\n");
    only = picked.map((c) => String(c.ref));
  }

  if (!csv.trim()) return NextResponse.json({ error: "no csv" }, { status: 400 });

  try {
    // Map to the ReviewChaser operator, creating one on first sync.
    let op = await rcOperatorByEmail(user.email);
    if (!op) {
      const fallbackName = user.email.split("@")[0] || "My Cleaning Business";
      op = await rcCreateOperator({ businessName: fallbackName, email: user.email });
    }

    const rcRes = await fetch(`${RC_ORIGIN}/api/import-csv`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${RC_COOKIE}=${signRcSession(op.id)}`,
      },
      body: JSON.stringify({ csv, only }),
    });
    const data = await rcRes.json().catch(() => ({}));
    if (!rcRes.ok) {
      console.error("[rc/import] RC importer failed", rcRes.status, data);
      return NextResponse.json({ error: "rc import failed", status: rcRes.status }, { status: 502 });
    }
    return NextResponse.json({ ok: true, imported: data.imported ?? 0 });
  } catch (e) {
    console.error("[rc/import]", e);
    return NextResponse.json({ error: "rc import error" }, { status: 502 });
  }
}
