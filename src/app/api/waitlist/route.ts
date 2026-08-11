// POST /api/waitlist — join the automatic-runs waitlist: insert into subscribers
// (idempotent) and email the admin via the ReviewChaser notify relay.
import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const { data: existing } = await supabase
    .from("subscribers")
    .select("id")
    .eq("email", user.email)
    .eq("source", "waitlist")
    .limit(1);

  if (!existing?.length) {
    const { error: dbError } = await supabase
      .from("subscribers")
      .insert({ email: user.email, source: "waitlist" });
    if (dbError) {
      console.error("[waitlist] insert failed:", dbError.message);
      return NextResponse.json({ error: "could not save" }, { status: 500 });
    }

    // Email the admin about the new signup, best-effort.
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
            subject: `📈 Waitlist: automatic dashboard runs — ${user.email}`,
            text: `${user.email} joined the waitlist for automatic rolling Cleaner Dashboard runs.\n\nLogged in the Sergio Supabase subscribers table (source=waitlist).`,
          }),
          cache: "no-store",
        });
      } catch (e) {
        console.warn("[waitlist] notify failed:", (e as Error).message);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
