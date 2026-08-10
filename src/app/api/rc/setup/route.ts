// POST /api/rc/setup — first-run: create the ReviewChaser operator for this
// portal user (their verified login email becomes the operator identity),
// then sign them straight in via the rc_session cookie.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RC_COOKIE, RC_SESSION_MAX_AGE, rcConfigured, rcCreateOperator, rcOperatorByEmail, signRcSession } from "@/lib/rc";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  if (!rcConfigured()) {
    return NextResponse.json({ error: "ReviewChaser link not configured" }, { status: 500 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {}
  const str = (v: unknown, max: number) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

  const businessName = str(body.businessName, 120);
  if (!businessName) {
    return NextResponse.json({ error: "Business name is required" }, { status: 400 });
  }
  const googleReviewUrl = str(body.googleReviewUrl, 400);
  if (googleReviewUrl && !/^https:\/\//.test(googleReviewUrl)) {
    return NextResponse.json({ error: "Google review link must start with https://" }, { status: 400 });
  }

  try {
    // Idempotent: if an operator already exists for this email, sign into it.
    let op = await rcOperatorByEmail(user.email);
    if (!op) {
      // Create through ReviewChaser's own /api/onboard so the welcome email and
      // the admin signup alert fire exactly like a direct signup would.
      const origin = process.env.RC_APP_ORIGIN || "https://reviewchaser.vercel.app";
      const r = await fetch(`${origin}/api/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          email: user.email,
          googleReviewUrl,
          elapsedMs: 60000, // server-to-server; satisfies the human-speed bot filter
        }),
        cache: "no-store",
      });
      if (r.ok) op = await rcOperatorByEmail(user.email);
      // Fallback: direct insert (no emails) if onboard is unavailable.
      if (!op) op = await rcCreateOperator({ businessName, email: user.email, googleReviewUrl });
    }

    const res = NextResponse.json({ ok: true, business: op.business_name });
    res.cookies.set(RC_COOKIE, signRcSession(op.id), {
      maxAge: RC_SESSION_MAX_AGE,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
    return res;
  } catch (e) {
    console.error("[rc/setup]", e);
    return NextResponse.json({ error: "could not create ReviewChaser account" }, { status: 502 });
  }
}
