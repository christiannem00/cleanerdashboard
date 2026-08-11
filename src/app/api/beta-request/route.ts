// POST /api/beta-request — log a beta-access request to the feedback table AND email
// the admin (alerts@serviche.com) via ReviewChaser's notify-admin relay.
import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  let body: any = {};
  try {
    body = await request.json();
  } catch {}
  const str = (v: unknown, max: number) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  const context = str(body.context, 200);
  const message = str(body.message, 2000);
  if (!context) return NextResponse.json({ error: "missing context" }, { status: 400 });

  const { error: dbError } = await supabase.from("feedback").insert({
    user_id: user.id,
    email: user.email,
    kind: "beta_request",
    context,
    message,
    upload_id: str(body.uploadId, 60),
  });
  if (dbError) {
    console.error("[beta-request] insert failed:", dbError.message);
    return NextResponse.json({ error: "could not save request" }, { status: 500 });
  }

  // Email the admin, best-effort — a mail failure never fails the request.
  const secret = process.env.RC_LOGIN_SECRET || "";
  if (secret) {
    try {
      const exp = Date.now() + 5 * 60 * 1000;
      const payload = `svc.portal.${exp}`;
      const sig = createHmac("sha256", secret).update(payload).digest("base64url");
      const origin = process.env.RC_APP_ORIGIN || "https://reviewchaser.vercel.app";
      await fetch(`${origin}/api/notify-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${payload}.${sig}` },
        body: JSON.stringify({
          subject: `🧪 Beta request: ${context}`,
          text: `${user.email} requested beta access.\n\nFeature: ${context}\nNote: ${message || "—"}\n\nLogged in the Sergio Supabase feedback table (kind=beta_request).`,
        }),
        cache: "no-store",
      });
    } catch (e) {
      console.warn("[beta-request] notify failed:", (e as Error).message);
    }
  }

  return NextResponse.json({ ok: true });
}
