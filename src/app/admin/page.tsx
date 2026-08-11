import Link from "next/link";
import { createAdminClient, requireAdmin } from "@/lib/supabase/admin";
import AdminTabs from "@/components/AdminTabs";
import AdminUsersTable, { type AdminUser } from "@/components/AdminUsersTable";
import { phoneServiceLabel, bookingSoftwareLabel, fmtAgo } from "@/lib/labels";

export const dynamic = "force-dynamic";

type Row = Record<string, any>;

type Activity = {
  at: string;
  email: string;
  userId: string | null;
  kind: string;
  detail: string;
};

export default async function AdminOverview() {
  const me = await requireAdmin();
  const db = createAdminClient();

  // Auth users are the source of truth for "who signed up" — the profiles row
  // depends on a trigger, so we never key the list off it. Everything else is
  // merged on top. Any query error is surfaced, never silently shown as empty.
  const errors: string[] = [];
  const [
    authList,
    profilesRes,
    businessesRes,
    uploadsRes,
    feedbackRes,
    subscribersRes,
  ] = await Promise.all([
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    db.from("profiles").select("id, email, created_at"),
    db
      .from("business_profiles")
      .select(
        "user_id, phone_service, phone_service_other, booking_software, booking_software_other, created_at, updated_at"
      ),
    db.from("uploads").select("id, user_id, filename, label, period, created_at, data"),
    db.from("feedback").select("id, user_id, email, kind, context, message, created_at"),
    db.from("subscribers").select("email, source, created_at"),
  ]);

  if (authList?.error) errors.push(`auth.listUsers: ${authList.error.message}`);
  if (profilesRes.error) errors.push(`profiles: ${profilesRes.error.message}`);
  if (businessesRes.error) errors.push(`business_profiles: ${businessesRes.error.message}`);
  if (uploadsRes.error) errors.push(`uploads: ${uploadsRes.error.message}`);
  if (feedbackRes.error) errors.push(`feedback: ${feedbackRes.error.message}`);
  if (subscribersRes.error) errors.push(`subscribers: ${subscribersRes.error.message}`);

  const authUsers = authList?.data?.users ?? [];
  const profiles = profilesRes.data ?? [];
  const businesses = businessesRes.data ?? [];
  const uploads = uploadsRes.data ?? [];
  const feedback = feedbackRes.data ?? [];
  const subscribers = subscribersRes.data ?? [];

  const profileById = new Map<string, Row>(profiles.map((p: Row) => [p.id, p]));
  const bizByUser = new Map<string, Row>();
  businesses.forEach((b: Row) => bizByUser.set(b.user_id, b));

  const uploadsByUser = new Map<string, Row[]>();
  uploads.forEach((u: Row) => {
    const arr = uploadsByUser.get(u.user_id) ?? [];
    arr.push(u);
    uploadsByUser.set(u.user_id, arr);
  });

  const feedbackByUser = new Map<string, Row[]>();
  feedback.forEach((f: Row) => {
    const arr = feedbackByUser.get(f.user_id) ?? [];
    arr.push(f);
    feedbackByUser.set(f.user_id, arr);
  });

  const waitlistEmails = new Set<string>(
    subscribers
      .filter((s: Row) => (s.source ?? "") === "waitlist")
      .map((s: Row) => (s.email ?? "").toLowerCase())
  );
  const subscribedEmails = new Set<string>(
    subscribers.map((s: Row) => (s.email ?? "").toLowerCase())
  );

  // Build one record per auth user (with full nested detail for the inline
  // dropdown), newest signups first.
  const users: AdminUser[] = authUsers
    .map((a: Row): AdminUser => {
      const p = profileById.get(a.id);
      const biz = bizByUser.get(a.id);
      const ups = (uploadsByUser.get(a.id) ?? []).sort(
        (x, y) => +new Date(y.created_at) - +new Date(x.created_at)
      );
      const fbs = (feedbackByUser.get(a.id) ?? []).sort(
        (x, y) => +new Date(y.created_at) - +new Date(x.created_at)
      );
      const email = (a.email ?? p?.email ?? "").toLowerCase();
      return {
        id: a.id,
        email: a.email ?? p?.email ?? "—",
        signedUp: a.created_at ?? p?.created_at ?? null,
        onboarded: Boolean(biz),
        phone: phoneServiceLabel(biz?.phone_service, biz?.phone_service_other),
        booking: bookingSoftwareLabel(biz?.booking_software, biz?.booking_software_other),
        uploadCount: ups.length,
        lastUpload: ups[0]?.created_at ?? null,
        noteCount: fbs.filter((f) => (f.kind ?? "note") === "note").length,
        betaCount: fbs.filter((f) => f.kind === "beta_request").length,
        onWaitlist: waitlistEmails.has(email),
        subscribed: subscribedEmails.has(email),
        lastSignIn: a.last_sign_in_at ?? null,
        confirmed: Boolean(a.email_confirmed_at),
        onboardingSaved: biz?.updated_at ?? null,
        uploads: ups.map((up: Row) => ({
          id: up.id,
          title: up.label || up.filename || "Upload",
          period: up.period ?? null,
          created_at: up.created_at,
          cleaners: up.data?.totals?.cleaners ?? null,
          jobs: up.data?.totals?.jobs ?? null,
          rev_mo: up.data?.totals?.rev_mo ?? null,
        })),
        feedback: fbs.map((f: Row) => ({
          id: f.id,
          kind: f.kind ?? "note",
          context: f.context ?? null,
          message: f.message ?? null,
          created_at: f.created_at,
        })),
      };
    })
    .sort((a, b) => +new Date(b.signedUp ?? 0) - +new Date(a.signedUp ?? 0));

  const now = Date.now();
  const WEEK = 7 * 864e5;
  const newThisWeek = users.filter(
    (u) => u.signedUp && now - +new Date(u.signedUp) < WEEK
  ).length;
  const totalUploads = uploads.length;
  const betaRequests = feedback.filter((f: Row) => f.kind === "beta_request").length;
  const onboardedCount = users.filter((u) => u.onboarded).length;

  // Cross-user activity feed.
  const emailOf = (uid: string | null) => {
    if (!uid) return "someone";
    const a = authUsers.find((u: Row) => u.id === uid);
    return a?.email || profileById.get(uid)?.email || "someone";
  };
  const activity: Activity[] = [];
  authUsers.forEach((a: Row) =>
    activity.push({ at: a.created_at, email: a.email, userId: a.id, kind: "signup", detail: "signed up" })
  );
  businesses.forEach((b: Row) =>
    activity.push({
      at: b.created_at,
      email: emailOf(b.user_id),
      userId: b.user_id,
      kind: "onboard",
      detail: `finished onboarding · ${phoneServiceLabel(b.phone_service, b.phone_service_other)} + ${bookingSoftwareLabel(b.booking_software, b.booking_software_other)}`,
    })
  );
  uploads.forEach((u: Row) =>
    activity.push({
      at: u.created_at,
      email: emailOf(u.user_id),
      userId: u.user_id,
      kind: "upload",
      detail: `uploaded ${u.label || u.filename || "a CSV"}${u.data?.totals?.cleaners ? ` · ${u.data.totals.cleaners} cleaners` : ""}`,
    })
  );
  feedback.forEach((f: Row) =>
    activity.push({
      at: f.created_at,
      email: f.email || emailOf(f.user_id),
      userId: f.user_id,
      kind: f.kind === "beta_request" ? "beta" : "feedback",
      detail:
        f.kind === "beta_request"
          ? `requested beta access${f.context ? ` · ${f.context}` : ""}`
          : `left feedback${f.message ? `: “${String(f.message).slice(0, 80)}”` : ""}`,
    })
  );
  subscribers.forEach((s: Row) =>
    activity.push({
      at: s.created_at,
      email: s.email,
      userId: null,
      kind: "waitlist",
      detail: (s.source ?? "") === "waitlist" ? "joined the waitlist" : "subscribed to updates",
    })
  );
  activity.sort((a, b) => +new Date(b.at) - +new Date(a.at));
  const recent = activity.slice(0, 60);

  const ICON: Record<string, string> = {
    signup: "🆕",
    onboard: "✅",
    upload: "📤",
    beta: "🚀",
    feedback: "💬",
    waitlist: "📝",
  };

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <h1>Admin</h1>
            <div className="sub">Signed in as {me.email}</div>
          </div>
        </div>
        <div className="topright">
          <Link className="btn ghost" href="/dashboard">
            ← Back to app
          </Link>
        </div>
      </header>

      <AdminTabs />

      {errors.length > 0 && (
        <div
          className="msg err"
          style={{ marginBottom: 12 }}
        >
          <b>Couldn’t read some data from Supabase:</b>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {errors.map((e, i) => (
              <li key={i} style={{ fontFamily: "monospace", fontSize: 12 }}>{e}</li>
            ))}
          </ul>
          <div style={{ marginTop: 6, fontSize: 12 }}>
            Usually means <code>SUPABASE_SERVICE_ROLE_KEY</code> doesn’t match{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code>’s project.
          </div>
        </div>
      )}

      <div className="kpis">
        <div className="kpi">
          <div className="l">Total users</div>
          <div className="v">{users.length}</div>
          <div className="m">{newThisWeek} new this week</div>
        </div>
        <div className="kpi">
          <div className="l">Onboarded</div>
          <div className="v">{onboardedCount}</div>
          <div className="m">{users.length - onboardedCount} pending</div>
        </div>
        <div className="kpi">
          <div className="l">CSV uploads</div>
          <div className="v">{totalUploads}</div>
          <div className="m">across all users</div>
        </div>
        <div className="kpi">
          <div className="l">Beta requests</div>
          <div className="v">{betaRequests}</div>
          <div className="m">feature interest</div>
        </div>
        <div className="kpi">
          <div className="l">Waitlist</div>
          <div className="v">{waitlistEmails.size}</div>
          <div className="m">{subscribedEmails.size} total subscribers</div>
        </div>
        <div className="kpi">
          <div className="l">Feedback</div>
          <div className="v">{feedback.filter((f: Row) => (f.kind ?? "note") === "note").length}</div>
          <div className="m">notes left</div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h2>👥 All users ({users.length})</h2>
        <AdminUsersTable users={users} />
        <div className="section-note">
          Click a user to expand their full profile, uploads, and feedback. Read
          with the service role — every user is visible regardless of row-level security.
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h2>⚡ Recent activity</h2>
        {recent.length === 0 ? (
          <div className="empty" style={{ border: "none", margin: 0 }}>
            No activity yet.
          </div>
        ) : (
          <div>
            {recent.map((a, i) => (
              <div className="flag" key={i}>
                <div className="ava" style={{ background: "#111827", fontSize: 15 }}>
                  {ICON[a.kind] || "•"}
                </div>
                <div className="body">
                  <div>
                    {a.userId ? (
                      <a href={`#u-${a.userId}`} style={{ fontWeight: 600, color: "var(--brand)" }}>
                        {a.email}
                      </a>
                    ) : (
                      <b>{a.email}</b>
                    )}{" "}
                    <span className="mut">{a.detail}</span>
                  </div>
                  <div className="why">{fmtAgo(a.at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
