import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient, requireAdmin } from "@/lib/supabase/admin";
import {
  phoneServiceLabel,
  bookingSoftwareLabel,
  fmtDate,
  fmtAgo,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

type Row = Record<string, any>;

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: ".1em",
          color: "var(--muted)",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 3, fontSize: 14 }}>{value}</div>
    </div>
  );
}

export default async function AdminUserDetail({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();
  const db = createAdminClient();
  const id = params.id;

  const [
    { data: profile },
    { data: biz },
    { data: uploads },
    { data: feedback },
    authRes,
  ] = await Promise.all([
    db.from("profiles").select("id, email, created_at").eq("id", id).maybeSingle(),
    db.from("business_profiles").select("*").eq("user_id", id).maybeSingle(),
    db
      .from("uploads")
      .select("id, filename, label, period, created_at, data")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    db
      .from("feedback")
      .select("id, kind, context, message, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    db.auth.admin.getUserById(id),
  ]);

  const auth = authRes?.data?.user ?? null;
  if (!profile && !auth) notFound();

  const email = profile?.email ?? auth?.email ?? "—";
  const { data: subs } = await db
    .from("subscribers")
    .select("source, created_at")
    .eq("email", email);
  const onWaitlist = (subs ?? []).some((s: Row) => s.source === "waitlist");

  const betaReqs = (feedback ?? []).filter((f: Row) => f.kind === "beta_request");
  const notes = (feedback ?? []).filter((f: Row) => (f.kind ?? "note") === "note");

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <h1>{email}</h1>
            <div className="sub">User {id}</div>
          </div>
        </div>
        <div className="topright">
          <Link className="btn ghost" href="/admin">
            ← All users
          </Link>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 18,
          marginTop: 18,
        }}
        className="admincols"
      >
        {/* Profile */}
        <div className="panel">
          <h2>👤 Profile</h2>
          <Field label="Email" value={email} />
          <Field
            label="Onboarding"
            value={
              biz ? (
                <span className="tierb t-star">Completed</span>
              ) : (
                <span className="tierb t-watch">Not yet onboarded</span>
              )
            }
          />
          <Field
            label="Phone service"
            value={phoneServiceLabel(biz?.phone_service, biz?.phone_service_other)}
          />
          <Field
            label="Booking software"
            value={bookingSoftwareLabel(
              biz?.booking_software,
              biz?.booking_software_other
            )}
          />
          <Field
            label="Waitlist"
            value={onWaitlist ? "On the waitlist" : "Not on waitlist"}
          />
        </div>

        {/* Account / auth */}
        <div className="panel">
          <h2>🔑 Account</h2>
          <Field label="Signed up" value={fmtDate(profile?.created_at ?? auth?.created_at)} />
          <Field
            label="Email confirmed"
            value={
              auth?.email_confirmed_at ? (
                <>
                  Yes <span className="mut">· {fmtDate(auth.email_confirmed_at)}</span>
                </>
              ) : (
                <span className="warn">No</span>
              )
            }
          />
          <Field
            label="Last sign in"
            value={
              auth?.last_sign_in_at ? (
                <>
                  {fmtDate(auth.last_sign_in_at)}{" "}
                  <span className="mut">({fmtAgo(auth.last_sign_in_at)})</span>
                </>
              ) : (
                <span className="mut">Never</span>
              )
            }
          />
          <Field
            label="Onboarding saved"
            value={biz?.updated_at ? fmtDate(biz.updated_at) : "—"}
          />
        </div>
      </div>

      {/* Uploads */}
      <div className="panel" style={{ marginTop: 18 }}>
        <h2>📤 Uploads ({uploads?.length ?? 0})</h2>
        {uploads && uploads.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th className="l">File</th>
                  <th>Cleaners</th>
                  <th>Jobs</th>
                  <th>Revenue / mo</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u: Row) => {
                  const t = u.data?.totals || {};
                  return (
                    <tr key={u.id}>
                      <td className="name l">
                        {u.label || u.filename || "Upload"}
                        {u.period ? <small>{u.period}</small> : null}
                      </td>
                      <td>{t.cleaners ?? "—"}</td>
                      <td>{t.jobs ?? "—"}</td>
                      <td>{t.rev_mo ? `$${Number(t.rev_mo).toLocaleString()}` : "—"}</td>
                      <td>{fmtAgo(u.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty" style={{ border: "none", margin: 0 }}>
            No uploads yet.
          </div>
        )}
      </div>

      {/* Feedback + beta */}
      <div className="panel" style={{ marginTop: 18 }}>
        <h2>💬 Feedback &amp; beta requests</h2>
        {betaReqs.length === 0 && notes.length === 0 ? (
          <div className="empty" style={{ border: "none", margin: 0 }}>
            Nothing yet.
          </div>
        ) : (
          <div>
            {betaReqs.map((f: Row) => (
              <div className="flag" key={f.id}>
                <div className="ava" style={{ background: "#b45309", fontSize: 14 }}>
                  🚀
                </div>
                <div className="body">
                  <div>
                    <b>Requested beta access</b>{" "}
                    {f.context ? <span className="chip">{f.context}</span> : null}
                  </div>
                  <div className="why">{fmtDate(f.created_at)}</div>
                </div>
              </div>
            ))}
            {notes.map((f: Row) => (
              <div className="flag" key={f.id}>
                <div className="ava" style={{ background: "#166534", fontSize: 14 }}>
                  💬
                </div>
                <div className="body">
                  <div>
                    {f.message || <span className="mut">(empty note)</span>}
                  </div>
                  <div className="why">
                    {f.context ? `${f.context} · ` : ""}
                    {fmtDate(f.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
