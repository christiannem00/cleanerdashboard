import Link from "next/link";
import { createAdminClient, requireAdmin } from "@/lib/supabase/admin";
import {
  phoneServiceLabel,
  bookingSoftwareLabel,
  fmtDay,
  fmtAgo,
} from "@/lib/labels";

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

  // Pull everything with the service-role key (bypasses RLS).
  const [
    { data: profiles },
    { data: businesses },
    { data: uploads },
    { data: feedback },
    { data: subscribers },
    authList,
  ] = await Promise.all([
    db.from("profiles").select("id, email, created_at"),
    db
      .from("business_profiles")
      .select(
        "user_id, phone_service, phone_service_other, booking_software, booking_software_other, created_at"
      ),
    db.from("uploads").select("id, user_id, filename, label, created_at, data"),
    db.from("feedback").select("id, user_id, email, kind, context, message, created_at"),
    db.from("subscribers").select("email, source, created_at"),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const authUsers = authList?.data?.users ?? [];
  const authById = new Map<string, any>(authUsers.map((u: any) => [u.id, u]));

  const bizByUser = new Map<string, Row>();
  (businesses ?? []).forEach((b: Row) => bizByUser.set(b.user_id, b));

  const uploadsByUser = new Map<string, Row[]>();
  (uploads ?? []).forEach((u: Row) => {
    const arr = uploadsByUser.get(u.user_id) ?? [];
    arr.push(u);
    uploadsByUser.set(u.user_id, arr);
  });

  const feedbackByUser = new Map<string, Row[]>();
  (feedback ?? []).forEach((f: Row) => {
    const arr = feedbackByUser.get(f.user_id) ?? [];
    arr.push(f);
    feedbackByUser.set(f.user_id, arr);
  });

  const waitlistEmails = new Set<string>(
    (subscribers ?? [])
      .filter((s: Row) => (s.source ?? "") === "waitlist")
      .map((s: Row) => (s.email ?? "").toLowerCase())
  );
  const subscribedEmails = new Set<string>(
    (subscribers ?? []).map((s: Row) => (s.email ?? "").toLowerCase())
  );

  // One combined per-user record, newest signups first.
  const users = (profiles ?? [])
    .map((p: Row) => {
      const biz = bizByUser.get(p.id);
      const ups = (uploadsByUser.get(p.id) ?? []).sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
      );
      const fbs = feedbackByUser.get(p.id) ?? [];
      const auth = authById.get(p.id);
      const email = (p.email ?? auth?.email ?? "").toLowerCase();
      return {
        id: p.id,
        email: p.email ?? auth?.email ?? "—",
        signedUp: p.created_at ?? auth?.created_at ?? null,
        onboarded: Boolean(biz),
        phone: phoneServiceLabel(biz?.phone_service, biz?.phone_service_other),
        booking: bookingSoftwareLabel(biz?.booking_software, biz?.booking_software_other),
        uploadCount: ups.length,
        lastUpload: ups[0]?.created_at ?? null,
        noteCount: fbs.filter((f) => (f.kind ?? "note") === "note").length,
        betaCount: fbs.filter((f) => f.kind === "beta_request").length,
        onWaitlist: waitlistEmails.has(email),
        subscribed: subscribedEmails.has(email),
        lastSignIn: auth?.last_sign_in_at ?? null,
        confirmed: Boolean(auth?.email_confirmed_at),
      };
    })
    .sort((a, b) => +new Date(b.signedUp ?? 0) - +new Date(a.signedUp ?? 0));

  // KPI counts.
  const now = Date.now();
  const WEEK = 7 * 864e5;
  const newThisWeek = users.filter(
    (u) => u.signedUp && now - +new Date(u.signedUp) < WEEK
  ).length;
  const totalUploads = uploads?.length ?? 0;
  const betaRequests = (feedback ?? []).filter((f: Row) => f.kind === "beta_request").length;
  const onboardedCount = users.filter((u) => u.onboarded).length;

  // Cross-user activity feed.
  const activity: Activity[] = [];
  const emailOf = (uid: string | null) =>
    (uid && (profiles ?? []).find((p: Row) => p.id === uid)?.email) || "someone";
  (profiles ?? []).forEach((p: Row) =>
    activity.push({ at: p.created_at, email: p.email, userId: p.id, kind: "signup", detail: "signed up" })
  );
  (businesses ?? []).forEach((b: Row) =>
    activity.push({
      at: b.created_at,
      email: emailOf(b.user_id),
      userId: b.user_id,
      kind: "onboard",
      detail: `finished onboarding · ${phoneServiceLabel(b.phone_service, b.phone_service_other)} + ${bookingSoftwareLabel(b.booking_software, b.booking_software_other)}`,
    })
  );
  (uploads ?? []).forEach((u: Row) =>
    activity.push({
      at: u.created_at,
      email: emailOf(u.user_id),
      userId: u.user_id,
      kind: "upload",
      detail: `uploaded ${u.label || u.filename || "a CSV"}${u.data?.totals?.cleaners ? ` · ${u.data.totals.cleaners} cleaners` : ""}`,
    })
  );
  (feedback ?? []).forEach((f: Row) =>
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
  (subscribers ?? []).forEach((s: Row) =>
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
            <h1>Admin · Users &amp; Activity</h1>
            <div className="sub">Signed in as {me.email}</div>
          </div>
        </div>
        <div className="topright">
          <Link className="btn ghost" href="/dashboard">
            ← Back to app
          </Link>
        </div>
      </header>

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
          <div className="v">{(feedback ?? []).filter((f: Row) => (f.kind ?? "note") === "note").length}</div>
          <div className="m">notes left</div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h2>👥 All users</h2>
        {users.length === 0 ? (
          <div className="empty" style={{ border: "none", margin: 0 }}>
            No users yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th className="l">User</th>
                  <th className="l">Phone service</th>
                  <th className="l">Booking software</th>
                  <th>Onboarded</th>
                  <th>Uploads</th>
                  <th>Feedback</th>
                  <th>Last active</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ cursor: "pointer" }}>
                    <td className="name l">
                      <Link href={`/admin/${u.id}`}>
                        {u.email}
                        <small>
                          joined {fmtDay(u.signedUp)}
                          {u.confirmed ? "" : " · unconfirmed"}
                        </small>
                      </Link>
                    </td>
                    <td className="l">{u.phone}</td>
                    <td className="l">{u.booking}</td>
                    <td>
                      {u.onboarded ? (
                        <span className="tierb t-star">Yes</span>
                      ) : (
                        <span className="tierb t-watch">Pending</span>
                      )}
                    </td>
                    <td>
                      {u.uploadCount}
                      {u.lastUpload ? (
                        <small style={{ display: "block", color: "var(--muted)" }}>
                          {fmtAgo(u.lastUpload)}
                        </small>
                      ) : null}
                    </td>
                    <td>
                      {u.noteCount || u.betaCount ? (
                        <>
                          {u.noteCount ? `${u.noteCount} note${u.noteCount > 1 ? "s" : ""}` : ""}
                          {u.betaCount ? (
                            <span className="betachip" style={{ marginLeft: 6 }}>
                              {u.betaCount} beta
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="mut">—</span>
                      )}
                    </td>
                    <td>
                      {u.lastSignIn ? (
                        fmtAgo(u.lastSignIn)
                      ) : (
                        <span className="mut">never</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="section-note">
          Click a user for their full profile and activity. Data read with the
          service role — every user is visible here regardless of row-level security.
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
                <div
                  className="ava"
                  style={{ background: "#111827", fontSize: 15 }}
                >
                  {ICON[a.kind] || "•"}
                </div>
                <div className="body">
                  <div>
                    {a.userId ? (
                      <Link href={`/admin/${a.userId}`} style={{ fontWeight: 600 }}>
                        {a.email}
                      </Link>
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
