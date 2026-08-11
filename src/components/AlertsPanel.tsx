"use client";
import { buildAlerts } from "@/lib/alerts";
import type { Dataset } from "@/lib/compute";

const money = (n: number) => "$" + Math.round(n || 0).toLocaleString("en-US");

// The top-of-dashboard alerts feed: a headline count of what needs attention,
// then dollar-forward cards that each say why it matters and what to do.
export default function AlertsPanel({ data }: { data: Dataset }) {
  const { count, alerts } = buildAlerts(data);
  const clean = count === 0;

  return (
    <section className="alerts-wrap" data-section="Urgent alerts">
      <div className={"alerts-header" + (clean ? " clear" : "")}>
        <span className="alerts-siren">{clean ? "✅" : "🚨"}</span>
        {clean ? (
          <span>Sergio found <b>no urgent alerts</b> — your business is running clean</span>
        ) : (
          <span>Sergio found <b>{count}</b> urgent alert{count === 1 ? "" : "s"} for your business</span>
        )}
      </div>

      <div className="alerts-list">
        {alerts.map((a) => (
          <div className={"alert alert-" + a.tone} key={a.id}>
            <div className="alert-icon">{a.icon}</div>
            <div className="alert-body">
              <div className="alert-head">
                {a.amount != null && (
                  <span className="alert-fig">{money(a.amount)}{a.amountSuffix}</span>
                )}
                <span className="alert-headtext">{a.headline}</span>
              </div>
              <p className="alert-why">
                {a.why}
                {a.estimated && <span className="alert-est"> Estimated at the current rate.</span>}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
