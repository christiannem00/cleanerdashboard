// POST /api/rc/sso — single sign-on into ReviewChaser. The Supabase-authenticated
// portal user is mapped to their ReviewChaser operator row by verified email;
// on match we mint the rc_session cookie so the proxied ReviewChaser UI/APIs
// accept the browser without a second login.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RC_COOKIE, RC_SESSION_MAX_AGE, rcConfigured, rcOperatorByEmail, signRcSession } from "@/lib/rc";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  if (!rcConfigured()) {
    return NextResponse.json({ error: "ReviewChaser link not configured" }, { status: 500 });
  }

  try {
    const op = await rcOperatorByEmail(user.email);
    if (!op) return NextResponse.json({ needsSetup: true });

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
    console.error("[rc/sso]", e);
    return NextResponse.json({ error: "ReviewChaser lookup failed" }, { status: 502 });
  }
}
