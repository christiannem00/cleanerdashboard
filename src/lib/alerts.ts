// Turns a Dataset into a prioritized feed of URGENT, dollar-forward alerts for the
// top of the dashboard — the things that cost money or lose clients if ignored. Each
// alert leads with a number, then explains why it matters and what to do. Pure.
import type { Dataset } from "./compute";

export type Alert = {
  id: "unpaid" | "mistakes" | "overdue" | "clear";
  icon: string;
  amount: number | null; // big figure; null → headline stands alone
  amountSuffix: string; // "", "/yr"
  headline: string; // text after the figure
  why: string; // why it matters + the action to take
  tone: "urgent" | "warn" | "good";
  estimated?: boolean; // figure is a run-rate estimate, not an actual total
};

export type AlertsResult = { count: number; alerts: Alert[] };

const money = (n: number) => "$" + Math.round(n || 0).toLocaleString("en-US");

export function buildAlerts(data: Dataset): AlertsResult {
  const t = data.totals;
  const alerts: Alert[] = [];

  // 1) UNPAID JOBS — money already earned but not collected. Everyone gets this instantly.
  if (t.unpaid_total > 0) {
    const n = t.unpaid_clients;
    alerts.push({
      id: "unpaid",
      icon: "💸",
      amount: t.unpaid_total,
      amountSuffix: "",
      headline: "in unpaid jobs need your attention",
      why: `${n} client${n === 1 ? "" : "s"} still owe you for completed cleans. This is cash you've already earned — the fastest, cheapest money you'll ever collect. Send a payment reminder today, before it ages into a write-off.`,
      tone: "urgent",
    });
  }

  // 2) COST OF MISTAKES — refunds + comps, spoken as real dollars lost, pinned to the
  //    cleaner who cost the most. Shown even when there are no unpaid jobs.
  const leaker = [...data.cleaners].sort((a, b) => b.credits - a.credits)[0];
  if (leaker && leaker.credits > 0) {
    const c = leaker.op_complaints;
    const cause =
      c > 0
        ? `triggered ${c} service complaint${c === 1 ? "" : "s"} that ended in ${money(leaker.credits)} handed back to clients`
        : `gave ${money(leaker.credits)} back to clients in refunds & comps`;
    alerts.push({
      id: "mistakes",
      icon: "⚠️",
      amount: leaker.credits,
      amountSuffix: "",
      headline: "lost to refunds & comps this period",
      why: `${leaker.name} ${cause}. One bad clean can end a recurring account worth thousands a year — do a quality review before it costs you a client.`,
      tone: "urgent",
    });
  }

  // 3) OVERDUE REGULARS — recurring revenue quietly walking out the door.
  const overdue = data.clients.filter((x) => x.overdue);
  if (overdue.length) {
    const atRiskMo = overdue.reduce((s, x) => {
      const ticket = x.jobs ? x.spend / x.jobs : 0;
      const perMo = x.cadence_days ? 30 / x.cadence_days : 1;
      return s + ticket * perMo;
    }, 0);
    alerts.push({
      id: "overdue",
      icon: "⏰",
      amount: atRiskMo > 0 ? atRiskMo * 12 : null,
      amountSuffix: "/yr",
      headline: "of recurring revenue is slipping away",
      why: `${overdue.length} regular${overdue.length === 1 ? " is" : "s are"} overdue for a visit. A recurring client who lapses rarely comes back on their own — a quick check-in text usually saves them. They're in the churn-risk list below, ready to send.`,
      tone: "warn",
      estimated: true,
    });
  }

  // Urgent-item count for the header (all issues, not just the ones summarized above).
  const count = t.unpaid_clients + t.total_complaints + t.overdue_clients;

  if (!alerts.length) {
    const top = [...data.cleaners].sort((a, b) => b.score - a.score)[0];
    alerts.push({
      id: "clear",
      icon: "✅",
      amount: null,
      amountSuffix: "",
      headline: "No urgent issues — your business is running clean",
      why: `No unpaid jobs, refunds, or overdue clients this period.${top ? ` ${top.name} is your top performer.` : ""} Scroll down for opportunities to grow — reviews to ask for and clients to win back.`,
      tone: "good",
    });
  }

  return { count, alerts };
}
