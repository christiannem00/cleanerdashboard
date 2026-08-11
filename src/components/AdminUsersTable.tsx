"use client";

import { Fragment, useEffect, useState } from "react";
import { fmtDate, fmtDay, fmtAgo } from "@/lib/labels";

export type AdminUpload = {
  id: string;
  title: string;
  period: string | null;
  created_at: string;
  cleaners: number | null;
  jobs: number | null;
  rev_mo: number | null;
};

export type AdminFeedback = {
  id: string;
  kind: string;
  context: string | null;
  message: string | null;
  created_at: string;
};

export type AdminUser = {
  id: string;
  email: string;
  signedUp: string | null;
  onboarded: boolean;
  phone: string;
  booking: string;
  uploadCount: number;
  lastUpload: string | null;
  noteCount: number;
  betaCount: number;
  onWaitlist: boolean;
  subscribed: boolean;
  lastSignIn: string | null;
  confirmed: boolean;
  onboardingSaved: string | null;
  uploads: AdminUpload[];
  feedback: AdminFeedback[];
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)" }}>
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

function Detail({ u }: { u: AdminUser }) {
  const beta = u.feedback.filter((f) => f.kind === "beta_request");
  const notes = u.feedback.filter((f) => (f.kind ?? "note") === "note");
  return (
    <div style={{ background: "#fbfcfd", padding: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {/* Profile */}
        <div className="panel" style={{ background: "#fff" }}>
          <h2>👤 Profile</h2>
          <Field label="Email" value={u.email} />
          <Field
            label="Onboarding"
            value={
              u.onboarded ? (
                <span className="tierb t-star">Completed</span>
              ) : (
                <span className="tierb t-watch">Not yet onboarded</span>
              )
            }
          />
          <Field label="Phone service" value={u.phone} />
          <Field label="Booking software" value={u.booking} />
          <Field label="Waitlist" value={u.onWaitlist ? "On the waitlist" : "Not on waitlist"} />
        </div>

        {/* Account */}
        <div className="panel" style={{ background: "#fff" }}>
          <h2>🔑 Account</h2>
          <Field label="Signed up" value={fmtDate(u.signedUp)} />
          <Field
            label="Email confirmed"
            value={u.confirmed ? "Yes" : <span className="warn">No</span>}
          />
          <Field
            label="Last sign in"
            value={
              u.lastSignIn ? (
                <>
                  {fmtDate(u.lastSignIn)} <span className="mut">({fmtAgo(u.lastSignIn)})</span>
                </>
              ) : (
                <span className="mut">Never</span>
              )
            }
          />
          <Field label="Onboarding saved" value={u.onboardingSaved ? fmtDate(u.onboardingSaved) : "—"} />
        </div>
      </div>

      {/* Uploads */}
      <div className="panel" style={{ marginTop: 14, background: "#fff" }}>
        <h2>📤 Uploads ({u.uploads.length})</h2>
        {u.uploads.length ? (
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
                {u.uploads.map((up) => (
                  <tr key={up.id}>
                    <td className="name l">
                      {up.title}
                      {up.period ? <small>{up.period}</small> : null}
                    </td>
                    <td>{up.cleaners ?? "—"}</td>
                    <td>{up.jobs ?? "—"}</td>
                    <td>{up.rev_mo ? `$${Number(up.rev_mo).toLocaleString()}` : "—"}</td>
                    <td>{fmtAgo(up.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty" style={{ border: "none", margin: 0 }}>
            No uploads yet.
          </div>
        )}
      </div>

      {/* Feedback */}
      <div className="panel" style={{ marginTop: 14, background: "#fff" }}>
        <h2>💬 Feedback &amp; beta requests</h2>
        {beta.length === 0 && notes.length === 0 ? (
          <div className="empty" style={{ border: "none", margin: 0 }}>
            Nothing yet.
          </div>
        ) : (
          <div>
            {beta.map((f) => (
              <div className="flag" key={f.id}>
                <div className="ava" style={{ background: "#b45309", fontSize: 14 }}>
                  🚀
                </div>
                <div className="body">
                  <div>
                    <b>Requested beta access</b>{" "}
                    {f.context ? <span className="chip">📍 {f.context}</span> : null}
                  </div>
                  <div className="why">{fmtDate(f.created_at)}</div>
                </div>
              </div>
            ))}
            {notes.map((f) => (
              <div className="flag" key={f.id}>
                <div className="ava" style={{ background: "#166534", fontSize: 14 }}>
                  💬
                </div>
                <div className="body">
                  {f.context ? (
                    <div style={{ marginBottom: 3 }}>
                      <span className="chip" style={{ background: "#e7f2ea", color: "#166534" }}>
                        📍 {f.context}
                      </span>
                    </div>
                  ) : null}
                  <div>{f.message || <span className="mut">(empty note)</span>}</div>
                  <div className="why">{fmtDate(f.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminUsersTable({ users }: { users: AdminUser[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Deep-link support: /admin#u-<id> (e.g. from the activity feed) expands and
  // scrolls to that user.
  useEffect(() => {
    const openFromHash = () => {
      const m = window.location.hash.match(/^#u-(.+)$/);
      if (!m) return;
      const id = m[1];
      setOpen((prev) => new Set(prev).add(id));
      const row = document.getElementById(`u-${id}`);
      if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  if (users.length === 0) {
    return (
      <div className="empty" style={{ border: "none", margin: 0 }}>
        No users yet.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <thead>
          <tr>
            <th className="l" style={{ width: 24 }}></th>
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
          {users.map((u) => {
            const isOpen = open.has(u.id);
            return (
              <Fragment key={u.id}>
                <tr
                  id={`u-${u.id}`}
                  onClick={() => toggle(u.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ color: "var(--muted)", fontFamily: "inherit" }}>{isOpen ? "▾" : "▸"}</td>
                  <td className="name l">
                    {u.email}
                    <small>
                      joined {fmtDay(u.signedUp)}
                      {u.confirmed ? "" : " · unconfirmed"}
                    </small>
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
                      <small style={{ display: "block", color: "var(--muted)" }}>{fmtAgo(u.lastUpload)}</small>
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
                  <td>{u.lastSignIn ? fmtAgo(u.lastSignIn) : <span className="mut">never</span>}</td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={8} style={{ padding: 0, textAlign: "left" }}>
                      <Detail u={u} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
