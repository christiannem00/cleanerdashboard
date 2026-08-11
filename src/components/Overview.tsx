"use client";
import Link from "next/link";
import InsightCard from "@/components/InsightCard";
import CopyButton from "@/components/CopyButton";
import type { Dataset } from "@/lib/compute";

const money = (n: number) => "$" + Math.round(n || 0).toLocaleString("en-US");
const firstName = (n: string) => (n || "").trim().split(/\s+/)[0] || "there";

// The login-landing dashboard: the "Aha!" moments first (headline insight +
// where-the-margin-goes + team quality), then three ready-to-work action lists.
export default function Overview({ data }: { data: Dataset }) {
  const t = data.totals;
  const reactivation = data.clients.filter((c) => c.reactivation).slice(0, 12);
  const reviewAsk = data.clients.filter((c) => c.review_ask).slice(0, 12);
  const overdue = data.clients.filter((c) => c.overdue).sort((a, b) => b.days_since_last - a.days_since_last).slice(0, 12);
  const pairs = data.pairs.filter((p) => p.jobs >= 1);
  const worstService = data.services[0]; // sorted worst-margin first

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <h1>Your business at a glance</h1>
            <div className="sub">Sergio read your latest export — here&apos;s what matters right now.</div>
          </div>
        </div>
        <div className="topright">
          <Link className="btn ghost" href="/upload">+ New upload</Link>
        </div>
      </header>

      {/* 1 — the headline aha */}
      <InsightCard data={data} />

      {/* 2 — where the money goes (margin) */}
      <div className="kpis" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="kpi"><div className="l">Revenue</div><div className="v">{money(t.revenue)}</div><div className="m">this period</div></div>
        <div className="kpi"><div className="l">Labor paid</div><div className="v">{money(t.provider_pay)}</div><div className="m">to cleaners</div></div>
        <div className="kpi"><div className="l">Gross margin</div><div className="v">{money(t.margin)}</div><div className="m">{t.margin_pct}% · before overhead</div></div>
        <div className="kpi"><div className="l">Given away</div><div className="v">{money(t.discounts)}</div><div className="m">discounts</div></div>
      </div>

      <div className="ovcols">
        {/* Margin by service */}
        <div className="panel" data-section="Margin by service">
          <h2>Where your margin goes <span className="mut" style={{ fontWeight: 400 }}>— by service type</span></h2>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr><th className="l">Service</th><th>Jobs</th><th>Avg ticket</th><th>Labor %</th><th>Margin %</th></tr>
              </thead>
              <tbody>
                {data.services.map((s) => (
                  <tr key={s.service}>
                    <td className="name l">{s.service}</td>
                    <td>{s.jobs}</td>
                    <td>{money(s.avg_ticket)}</td>
                    <td className={s.labor_pct >= 50 ? "warn" : ""}>{s.labor_pct}%</td>
                    <td className={s.margin_pct < 40 ? "warn" : ""} style={{ fontWeight: 600 }}>{s.margin_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="section-note">
            Gross margin = client revenue − cleaner pay (before gas, vehicles, marketing & overhead).
            {worstService && worstService.margin_pct < 45 && (
              <> <b>{worstService.service}</b> is your thinnest at {worstService.margin_pct}% — worth a pricing look.</>
            )}
          </div>
        </div>

        {/* Team quality: complaints + labor */}
        <div className="panel" data-section="Team quality">
          <h2>Team quality <span className="mut" style={{ fontWeight: 400 }}>— complaints &amp; labor cost</span></h2>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr><th className="l">Cleaner</th><th>Jobs</th><th>Complaints</th><th>Labor %</th><th>Rating</th></tr>
              </thead>
              <tbody>
                {[...data.cleaners].sort((a, b) => b.op_complaints - a.op_complaints || b.labor_pct - a.labor_pct).map((c) => (
                  <tr key={c.name} data-cleaner={c.name}>
                    <td className="name l">{c.name}</td>
                    <td>{c.jobs}</td>
                    <td className={c.op_complaints >= 2 ? "warn" : ""} style={{ fontWeight: c.op_complaints ? 600 : 400 }}>
                      {c.op_complaints || "—"}
                    </td>
                    <td className={c.labor_pct >= 50 ? "warn" : ""}>{c.labor_pct}%</td>
                    <td>{c.avg_rating != null ? c.avg_rating.toFixed(2) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pairs.length > 0 && (
            <div className="section-note">
              <b>Pairings:</b>{" "}
              {pairs.map((p) => `${p.pair} — ${p.jobs} job${p.jobs > 1 ? "s" : ""}, ${p.complaints} complaint${p.complaints === 1 ? "" : "s"}`).join(" · ")}
            </div>
          )}
        </div>
      </div>

      {/* 3 — the three action lists */}
      <div className="ovlists">
        <ActionList
          icon="⭐"
          title="Ask for a review"
          empty="No happy clients waiting — great sign."
          count={reviewAsk.length}
          rows={reviewAsk.map((c) => ({
            key: c.id,
            name: c.name,
            meta: `${c.best_rating ?? 5}★ · ${c.email || c.phone || "no contact"}`,
            copyLabel: "Copy ask",
            copy: `Hi ${firstName(c.name)}! So glad your last clean hit the mark. Would you mind leaving us a quick Google review? It really helps our small team. [your Google link]`,
          }))}
          footer={<Link className="linkbtn" href="/reviews">Open Review Chaser →</Link>}
        />

        <ActionList
          icon="🔁"
          title="Win back (reactivation)"
          empty="No one-time clients to win back yet."
          count={reactivation.length}
          rows={reactivation.map((c) => ({
            key: c.id,
            name: c.name,
            meta: `last ${c.last || "—"} · ${c.days_since_last}d ago · ${money(c.spend)}`,
            copyLabel: "Copy win-back",
            copy: `Hi ${firstName(c.name)}! You have a $19.71 coupon on your account that expires next Friday. Would you like to book a cleaning service before then to lock in your discount?`,
          }))}
        />

        <ActionList
          icon="⏰"
          title="Churn risk (overdue)"
          empty="Every recurring client is on schedule."
          count={overdue.length}
          rows={overdue.map((c) => ({
            key: c.id,
            name: c.name,
            meta: `${c.frequency || "recurring"} · ${c.days_since_last}d since last`,
            copyLabel: "Copy check-in",
            copy: `Hi ${firstName(c.name)}! We noticed it's been a bit since your last clean — want me to get your next ${c.frequency || "visit"} back on the calendar?`,
          }))}
        />
      </div>

      <footer>Sergio — AI back office for cleaning companies. Numbers are gross (before overhead like gas, vehicles &amp; marketing).</footer>
    </div>
  );
}

type Row = { key: string; name: string; meta: string; copy: string; copyLabel: string };
function ActionList({
  icon,
  title,
  count,
  rows,
  empty,
  footer,
}: {
  icon: string;
  title: string;
  count: number;
  rows: Row[];
  empty: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="panel actionlist" data-section={title}>
      <h2>
        <span>{icon} {title}</span>
        <span className="countpill">{count}</span>
      </h2>
      {rows.length === 0 ? (
        <div className="section-note" style={{ borderTop: "none" }}>{empty}</div>
      ) : (
        <div className="actionrows">
          {rows.map((r) => (
            <div className="actionrow" key={r.key}>
              <div className="ar-main">
                <b>{r.name}</b>
                <small>{r.meta}</small>
              </div>
              <CopyButton text={r.copy} label={r.copyLabel} className="btn ghost sm" />
            </div>
          ))}
        </div>
      )}
      {footer && <div className="section-note" style={{ display: "flex", justifyContent: "flex-end" }}>{footer}</div>}
    </div>
  );
}
