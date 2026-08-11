import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin";
import { createRcClient, rcConfigured } from "@/lib/rc/client";
import { composeSms } from "@/lib/rc/compose";
import { stepLabel, MAX_SENDS } from "@/lib/rc/schedule";
import AdminTabs from "@/components/AdminTabs";
import CopyButton from "@/components/CopyButton";
import {
  markSent,
  markReviewed,
  stopFollowups,
  logReply,
  draftMarkSent,
  draftDiscard,
} from "./actions";

export const dynamic = "force-dynamic";

type Row = Record<string, any>;

function whenET(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <h1>Admin</h1>
            <div className="sub">ReviewChaser · manual Google Voice queue</div>
          </div>
        </div>
        <div className="topright">
          <Link className="btn ghost" href="/dashboard">
            ← Back to app
          </Link>
        </div>
      </header>
      <AdminTabs />
      {children}
    </div>
  );
}

export default async function SmsQueuePage() {
  await requireAdmin();

  if (!rcConfigured()) {
    return (
      <Shell>
        <div className="msg err">
          ReviewChaser isn’t configured — set <code>RC_SUPABASE_URL</code> and{" "}
          <code>RC_SERVICE_ROLE_KEY</code> in this project’s environment.
        </div>
      </Shell>
    );
  }

  const db = createRcClient();
  const now = Date.now();

  const { data: due, error: dueErr } = await db
    .from("rf_requests")
    .select("*, operators(business_name,email,campaign_on)")
    .in("status", ["pending", "sent", "needs_contact"])
    .order("next_send_at", { ascending: true, nullsFirst: false })
    .limit(150);

  const { data: draftsRaw, error: draftErr } = await db
    .from("rf_messages")
    .select("*, operators(business_name)")
    .in("direction", ["draft", "sent_custom"])
    .order("created_at", { ascending: true })
    .limit(80);

  const errors = [dueErr, draftErr].filter(Boolean).map((e: any) => e.message);

  const active = (due ?? []).filter((r: Row) => r.operators?.campaign_on !== false);
  const dueRows = active.filter(
    (r: Row) =>
      r.status === "needs_contact" ||
      (r.next_send_at && new Date(r.next_send_at).getTime() <= now)
  );
  const upcoming = active.filter(
    (r: Row) =>
      r.status !== "needs_contact" &&
      r.next_send_at &&
      new Date(r.next_send_at).getTime() > now
  );

  // Phone lookup for drafts (keyed by operator_id|booking_ref).
  const drafts = draftsRaw ?? [];
  const phoneByKey = new Map<string, string>();
  const bookingRefs = Array.from(
    new Set(drafts.map((d: Row) => d.booking_ref).filter(Boolean))
  );
  if (bookingRefs.length) {
    const { data: refRows } = await db
      .from("rf_requests")
      .select("to_phone, booking_ref, operator_id")
      .in("booking_ref", bookingRefs as string[]);
    (refRows ?? []).forEach((r: Row) =>
      phoneByKey.set(`${r.operator_id}|${r.booking_ref}`, r.to_phone)
    );
  }

  const pendingDrafts = drafts.filter((d: Row) => d.direction === "draft");
  const sentDrafts = drafts.filter((d: Row) => d.direction === "sent_custom");

  const smsHref = (phone: string, body: string) =>
    `sms:${encodeURIComponent(phone)}?&body=${encodeURIComponent(body)}`;

  return (
    <Shell>
      {errors.length > 0 && (
        <div className="msg err" style={{ marginBottom: 12 }}>
          <b>ReviewChaser query error:</b>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {errors.map((e, i) => (
              <li key={i} style={{ fontFamily: "monospace", fontSize: 12 }}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="insight" style={{ borderLeftColor: "var(--brand)" }}>
        <h3>📱 Manual Google Voice mode</h3>
        <p>
          Copy each text (or “Open in Messages”) and send it from the Google
          Voice number, then hit <b>Mark sent</b> to advance the schedule.
        </p>
      </div>

      {/* Operator custom drafts */}
      {pendingDrafts.length > 0 && (
        <div className="panel" style={{ marginTop: 18 }}>
          <h2>✍️ Custom texts from operators ({pendingDrafts.length})</h2>
          <div style={{ padding: 12 }}>
            {pendingDrafts.map((m: Row) => {
              const phone = phoneByKey.get(`${m.operator_id}|${m.booking_ref}`) || "";
              return (
                <div key={m.id} className="uprow" style={{ display: "block", borderColor: "#f0c36d", background: "#fffdf5" }}>
                  <div style={{ fontSize: 13 }}>
                    <b>{m.customer_name || "Unknown"}</b> · {phone || "no phone!"} ·{" "}
                    <em>{m.operators?.business_name || "?"}</em> · booking {m.booking_ref || "—"}
                  </div>
                  <textarea readOnly rows={2} defaultValue={m.body} style={{ width: "100%", marginTop: 8 }} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    <CopyButton text={m.body} />
                    {phone ? <a className="btn" href={smsHref(phone, m.body)}>Open in Messages</a> : null}
                    <form action={draftMarkSent}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="btn" type="submit">Mark sent</button>
                    </form>
                    <form action={draftDiscard}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="btn ghost" type="submit">Discard</button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Due now */}
      <div className="panel" style={{ marginTop: 18 }}>
        <h2>Texts to send ({dueRows.length})</h2>
        {dueRows.length === 0 ? (
          <div className="empty" style={{ border: "none", margin: 0 }}>
            Nothing due — the queue is empty. 🎉
          </div>
        ) : (
          <div style={{ padding: 12 }}>
            {dueRows.map((r: Row) => {
              const business = r.operators?.business_name || "your cleaner";
              if (!r.to_phone) {
                return (
                  <div key={r.id} className="uprow" style={{ display: "block", opacity: 0.7 }}>
                    <b>{r.to_name || "Unknown"}</b> · {business} · booking {r.booking_ref} — no phone on file
                  </div>
                );
              }
              const text = composeSms(r as any, business);
              return (
                <div key={r.id} className="uprow" style={{ display: "block" }}>
                  <div style={{ fontSize: 13 }}>
                    <b>{r.to_name || "Unknown"}</b> · {r.to_phone} · <em>{business}</em> · booking{" "}
                    {r.booking_ref} · <b>{stepLabel(r.step)}</b> ({r.step}/{MAX_SENDS} sent)
                  </div>
                  <textarea readOnly rows={3} defaultValue={text} style={{ width: "100%", marginTop: 8 }} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    <CopyButton text={text} />
                    <a className="btn" href={smsHref(r.to_phone, text)}>Open in Messages</a>
                    <form action={markSent}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn" type="submit">Mark sent</button>
                    </form>
                    <form action={markReviewed}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn" type="submit">⭐ Review Successful</button>
                    </form>
                    <form action={stopFollowups}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn ghost" type="submit">Stop follow-ups</button>
                    </form>
                  </div>
                  <form action={logReply} style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <input type="hidden" name="id" value={r.id} />
                    <input
                      name="reply"
                      placeholder="Paste the customer's reply (from Google Voice)…"
                      maxLength={2000}
                      style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", font: "inherit" }}
                    />
                    <button className="btn ghost" type="submit">Log reply</button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming */}
      <div className="panel" style={{ marginTop: 18 }}>
        <h2>Upcoming — scheduled ({upcoming.length})</h2>
        <p className="section-note" style={{ borderTop: "none" }}>
          Timers anchor to job completion: 24 hr → 3 day → 5 day → 7 day → 14 day.
          Marking one sent starts the timer for the next reminder.
        </p>
        {upcoming.length === 0 ? (
          <div className="empty" style={{ border: "none", margin: 0 }}>
            Nothing scheduled.
          </div>
        ) : (
          <div style={{ padding: 12 }}>
            {upcoming.map((r: Row) => (
              <div
                key={r.id}
                className="uprow"
                style={{ justifyContent: "space-between", color: "#4b5563" }}
              >
                <div style={{ fontSize: 13 }}>
                  <b>{r.to_name || "Unknown"}</b> · {r.to_phone || "no phone"} ·{" "}
                  <em>{r.operators?.business_name || "?"}</em> · next: <b>{stepLabel(r.step)}</b> ({r.step}/{MAX_SENDS} sent)
                </div>
                <div style={{ whiteSpace: "nowrap", fontWeight: 700 }}>⏱ {whenET(r.next_send_at)} ET</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed customs */}
      {sentDrafts.length > 0 && (
        <div className="panel" style={{ marginTop: 18 }}>
          <h2>✓ Sent custom texts ({sentDrafts.length})</h2>
          <div style={{ padding: 12 }}>
            {sentDrafts.map((m: Row) => (
              <div key={m.id} className="uprow" style={{ display: "block", borderColor: "#bbf7d0", background: "#f6fdf8", opacity: 0.85 }}>
                <div style={{ fontSize: 13 }}>
                  <b>{m.customer_name || "Unknown"}</b> · <em>{m.operators?.business_name || "?"}</em> · booking{" "}
                  {m.booking_ref || "—"} · <b style={{ color: "#166534" }}>✓ sent {whenET(m.created_at)} ET</b>
                </div>
                <textarea readOnly rows={2} defaultValue={m.body} style={{ width: "100%", marginTop: 8 }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}
