// Bridge to ReviewChaser. Mints the same stateless HMAC session token that
// reviewchaser's api/_lib/auth.js verifies (`sess.<operatorId>.<expMs>.<sig>`,
// sig = HMAC-SHA256(LOGIN_SECRET, payload) base64url). The token is set as the
// rc_session cookie on this domain; Next.js rewrites proxy the ReviewChaser
// dashboard + APIs onto the same origin, so the cookie reaches them unchanged.
import { createHmac, randomBytes } from "node:crypto";

const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;
export const RC_COOKIE = "rc_session";
export const RC_SESSION_MAX_AGE = Math.floor(SESSION_TTL_MS / 1000);

const rcUrl = () => (process.env.RC_SUPABASE_URL || "").replace(/\/$/, "");
const rcKey = () => process.env.RC_SERVICE_ROLE_KEY || "";
const rcSecret = () => process.env.RC_LOGIN_SECRET || "";

export const rcConfigured = () => Boolean(rcUrl() && rcKey() && rcSecret());

export function signRcSession(operatorId: string): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `sess.${operatorId}.${exp}`;
  const sig = createHmac("sha256", rcSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

async function rest(path: string, init?: { method?: string; body?: unknown; prefer?: string }) {
  const headers: Record<string, string> = {
    apikey: rcKey(),
    Authorization: `Bearer ${rcKey()}`,
    "Content-Type": "application/json",
  };
  if (init?.prefer) headers.Prefer = init.prefer;
  const res = await fetch(`${rcUrl()}/rest/v1/${path}`, {
    method: init?.method || "GET",
    headers,
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`rc supabase ${res.status}: ${text.slice(0, 200)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export type RcOperator = { id: string; business_name: string; email: string };

// Same rule as ReviewChaser's /api/login: newest operator row for the email wins.
export async function rcOperatorByEmail(email: string): Promise<RcOperator | null> {
  const rows = await rest(
    `operators?email=eq.${encodeURIComponent(email.toLowerCase())}&select=id,business_name,email&order=created_at.desc&limit=1`
  );
  return rows?.[0] || null;
}

export async function rcCreateOperator(input: {
  businessName: string;
  ownerName?: string | null;
  email: string;
  googleReviewUrl?: string | null;
}): Promise<RcOperator> {
  const rows = await rest("operators", {
    method: "POST",
    prefer: "return=representation",
    body: {
      business_name: input.businessName,
      owner_name: input.ownerName || null,
      email: input.email.toLowerCase(),
      google_review_url: input.googleReviewUrl || null,
      ingest_token: randomBytes(4).toString("hex"),
    },
  });
  return rows[0];
}
