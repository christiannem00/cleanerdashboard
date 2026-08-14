// Turns a scored Dataset into ONE surprising, dollar-denominated headline
// ("Sergio found $X …") plus a few supporting stat chips. Pure + deterministic
// so the same upload always reveals the same insight. Used on the upload preview
// (instant, pre-save) and at the top of the saved dashboard.
import type { Dataset, Cleaner } from "./compute";

export type Chip = { label: string; value: string; tone: "good" | "bad" | "neutral" };

export type Insight = {
  id:
    | "leak"
    | "expensive-earner"
    | "churn"
    | "team-leak"
    | "quiet-star"
    | "clean-team"
    | "overdue"
    | "discounts"
    | "review-ask"
    | "worst-cleaner";
  tone: "bad" | "good";
  // Big count-up number rendered in the hero. null → no animated figure.
  amount: number | null;
  amountPrefix: string; // "$"
  amountSuffix: string; // "/yr", ""
  eyebrow: string; // "Sergio found"
  headline: string; // the punchline
  detail: string; // the "why", 1–2 sentences
  cleaner?: string; // who it's about, if anyone
};

export type InsightResult = { hero: Insight; chips: Chip[] };

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const pct1 = (n: number) => (n || 0).toFixed(1) + "%";

// Annualize a period total off the actual span of the export (honest run-rate).
function annualizer(data: Dataset) {
  const wd = data.totals.window_days || 30;
  return (periodTotal: number) => periodTotal * (365 / wd);
}

export function pickInsight(data: Dataset): InsightResult {
  const cleaners = data.cleaners.filter((c) => c.jobs > 0);
  const annual = annualizer(data);
  const teamCredits = cleaners.reduce((s, c) => s + c.credits, 0);
  const hasChurn = cleaners.some((c) => c.has_churn ?? c.tot_book > 0);

  const byCredits = [...cleaners].sort((a, b) => b.credits - a.credits);
  const byRevMo = [...cleaners].sort((a, b) => b.rev_mo - a.rev_mo);
  const byScore = [...cleaners].sort((a, b) => b.score - a.score);
  const topEarner = byRevMo[0];
  const topScorer = byScore[0];
  const worstLeaker = byCredits[0];

  // ---- Candidate insights, each with a "wow" weight; highest wins. ----
  const candidates: (Insight & { wow: number })[] = [];

  // 0. WORST CLEANER — always the headline when the team has a weak link, so the
  //    insight is consistent (never celebrates the top cleaner, never flips between
  //    pages). Dominant wow so it wins whenever the worst cleaner has a real issue.
  const worst = [...cleaners].sort((a, b) => a.score - b.score)[0];
  // Only headline someone as the weakest cleaner for problems that are real in
  // ABSOLUTE terms — a single complaint or a token refund on an otherwise clean
  // roster is not a "$X/yr tied up" story.
  const worstHasIssue =
    worst &&
    (worst.op_complaints >= 2 ||
      (worst.jobs > 0 && (100 * worst.op_complaints) / worst.jobs >= 5) ||
      (hasChurn && worst.canc_rate >= 8) ||
      worst.credits >= 150 ||
      (worst.revenue > 0 && (100 * worst.credits) / worst.revenue >= 3) ||
      worst.tier === "risk");
  if (worst && worstHasIssue && cleaners.length >= 2) {
    const bits: string[] = [];
    if (worst.op_complaints > 0) bits.push(`${worst.op_complaints} service complaint${worst.op_complaints > 1 ? "s" : ""}`);
    if (hasChurn && worst.canc_rate >= 8) bits.push(`a ${pct1(worst.canc_rate)} cancellation rate`);
    if (worst.credits > 0) bits.push(`${money(worst.credits)} in refunds & comps`);
    const issue = bits.length ? bits.join(", ") : "the lowest performance score on your team";
    const annualLeak = worst.credits > 0 ? annual(worst.credits) : null;
    candidates.push({
      id: "worst-cleaner",
      tone: "bad",
      amount: annualLeak,
      amountPrefix: "$",
      amountSuffix: "/yr",
      eyebrow: "Sergio found your cleaner to watch",
      headline: annualLeak != null ? `tied up in your weakest cleaner` : `${worst.name} is your cleaner to watch`,
      detail: `${worst.name} ranks last of ${cleaners.length} cleaners — ${issue}. Worth a close look before it costs you clients.`,
      cleaner: worst.name,
      wow: 200,
    });
  }

  // A. Concentrated leak — one cleaner holds a big share of all money given back.
  // Same absolute-severity bar as the weakest-cleaner hero: a single small refund
  // ($113) shouldn't become a "$1,500/yr leak" headline about one person.
  if (teamCredits >= 40 && worstLeaker && worstLeaker.credits >= 150) {
    const share = worstLeaker.credits / teamCredits;
    const annualLeak = annual(worstLeaker.credits);
    if (share >= 0.34 && annualLeak >= 250) {
      candidates.push({
        id: "leak",
        tone: "bad",
        amount: annualLeak,
        amountPrefix: "$",
        amountSuffix: "/yr",
        eyebrow: "Sergio found",
        headline: `leaking through one cleaner`,
        detail: `${worstLeaker.name} alone accounts for ${money(worstLeaker.credits)} of refunds & comps — ${Math.round(
          share * 100,
        )}% of everything your whole team handed back. At this pace that's ${money(annualLeak)} a year.`,
        cleaner: worstLeaker.name,
        wow: 60 + share * 30 + Math.min(annualLeak / 1000, 20),
      });
    }
  }

  // B. The expensive earner — a top earner who is NOT a top performer. The surprise
  //    is the mismatch: the person you'd call your "best" is quietly costly.
  const topEarnerRank = topEarner ? byScore.findIndex((c) => c.name === topEarner.name) : -1;
  if (topEarner && (topEarner.tier === "watch" || topEarner.tier === "risk") && cleaners.length >= 3) {
    const gap = topEarnerRank + 1; // rank by score (1-based)
    candidates.push({
      id: "expensive-earner",
      tone: "bad",
      amount: topEarner.credits > 0 ? annual(topEarner.credits) : null,
      amountPrefix: "$",
      amountSuffix: "/yr",
      eyebrow: "Your top earner isn't your best cleaner",
      headline: `${topEarner.name} brings in the most — and ranks #${gap} of ${cleaners.length}`,
      detail:
        topEarner.credits > 0
          ? `${topEarner.name} is your #1 earner at ${money(topEarner.rev_mo)}/mo, but between refunds, comps${
              hasChurn ? " and cancellations" : ""
            } they score in your bottom tier — costing about ${money(annual(topEarner.credits))} a year in money given back.`
          : `${topEarner.name} is your #1 earner at ${money(topEarner.rev_mo)}/mo, but ranks #${gap} of ${cleaners.length} once churn and appeasements are counted. Volume is hiding a quality problem.`,
      cleaner: topEarner.name,
      wow: 50 + gap * 2,
    });
  }

  // C. Churn risk — a cleaner cancelling far above the team average.
  if (hasChurn) {
    const churny = cleaners.filter((c) => c.tot_book >= 5);
    const avg = churny.length ? churny.reduce((s, c) => s + c.canc_rate, 0) / churny.length : 0;
    const worstChurn = [...churny].sort((a, b) => b.canc_rate - a.canc_rate)[0];
    if (worstChurn && worstChurn.canc_rate >= 8 && avg > 0 && worstChurn.canc_rate >= avg * 1.8) {
      candidates.push({
        id: "churn",
        tone: "bad",
        amount: null,
        amountPrefix: "",
        amountSuffix: "",
        eyebrow: "Sergio found a retention risk",
        headline: `${worstChurn.name} cancels ${pct1(worstChurn.canc_rate)} of bookings`,
        detail: `That's ${(worstChurn.canc_rate / Math.max(avg, 0.1)).toFixed(
          1,
        )}× your team average of ${pct1(avg)}. Every cancellation is a client who may not rebook.`,
        cleaner: worstChurn.name,
        wow: 45 + worstChurn.canc_rate,
      });
    }
  }

  // D. Team-wide leak — no single villain, but the total given back is real money.
  if (teamCredits >= 40) {
    const annualLeak = annual(teamCredits);
    candidates.push({
      id: "team-leak",
      tone: "bad",
      amount: annualLeak,
      amountPrefix: "$",
      amountSuffix: "/yr",
      eyebrow: "Sergio found",
      headline: `going back to clients as refunds & comps`,
      detail: `Across ${cleaners.length} cleaners you handed back ${money(
        teamCredits,
      )} this period — a run-rate of about ${money(annualLeak)} a year. Most operators never total this up.`,
      wow: 30 + Math.min(annualLeak / 1000, 25),
    });
  }

  // E. Quiet star — positive delight: a reliable cleaner who isn't the loudest earner.
  const quietStar = byScore.find((c) => c.credits === 0 && c.jobs >= 5 && c.name !== topEarner?.name);
  if (quietStar) {
    candidates.push({
      id: "quiet-star",
      tone: "good",
      amount: null,
      amountPrefix: "",
      amountSuffix: "",
      eyebrow: "Sergio found your most reliable cleaner",
      headline: `${quietStar.name}: ${quietStar.jobs} jobs, zero money given back`,
      detail: `Not your highest earner, but not a single refund or comp across ${quietStar.jobs} jobs${
        hasChurn ? ` and a ${pct1(quietStar.canc_rate)} cancel rate` : ""
      }. This is who you build the team around.`,
      cleaner: quietStar.name,
      wow: 25,
    });
  }

  // F. Overdue recurring clients — revenue quietly walking out the door. Most
  //    actionable card there is: a named call list.
  const overdue = data.clients.filter((c) => c.overdue).sort((a, b) => b.spend - a.spend);
  if (overdue.length) {
    // Monthly revenue at risk = per-visit ticket × visits/month, summed.
    const atRiskMo = overdue.reduce((s, c) => {
      const ticket = c.jobs ? c.spend / c.jobs : 0;
      const perMo = c.cadence_days ? 30 / c.cadence_days : 1;
      return s + ticket * perMo;
    }, 0);
    const names = overdue.slice(0, 3).map((c) => c.name).join(", ");
    candidates.push({
      id: "overdue",
      tone: "bad",
      amount: atRiskMo > 0 ? atRiskMo * 12 : null,
      amountPrefix: "$",
      amountSuffix: "/yr",
      eyebrow: "Sergio found recurring clients slipping away",
      headline: `${overdue.length} regular${overdue.length > 1 ? "s are" : " is"} overdue for a visit`,
      detail: `${names}${overdue.length > 3 ? ` +${overdue.length - 3} more` : ""} ${
        overdue.length > 1 ? "haven't" : "hasn't"
      } been back on schedule. That's about ${money(atRiskMo * 12)}/yr of recurring revenue to win back with one round of calls.`,
      wow: 52 + overdue.length * 3,
    });
  }

  // G. Discount leakage — the number operators never total up.
  if (data.totals.discounts >= 150) {
    const annualDisc = annual(data.totals.discounts);
    candidates.push({
      id: "discounts",
      tone: "bad",
      amount: annualDisc,
      amountPrefix: "$",
      amountSuffix: "/yr",
      eyebrow: "Sergio added up your discounts",
      headline: `going out the door in plan discounts`,
      detail: `Across ${cleaners.length ? data.totals.clients : 0} clients you gave back ${money(
        data.totals.discounts,
      )} in recurring-plan and code discounts this period — about ${money(
        annualDisc,
      )} a year. Worth knowing which plans still pay off.`,
      wow: 34 + Math.min(annualDisc / 1500, 22),
    });
  }

  // H. Review targets — happy clients you haven't asked. Positive + actionable.
  if (data.totals.review_targets >= 1) {
    const names = data.clients
      .filter((c) => c.review_ask)
      .slice(0, 3)
      .map((c) => c.name)
      .join(", ");
    candidates.push({
      id: "review-ask",
      tone: "good",
      amount: null,
      amountPrefix: "",
      amountSuffix: "",
      eyebrow: "Sergio found reviews waiting to happen",
      headline: `${data.totals.review_targets} happy client${
        data.totals.review_targets > 1 ? "s" : ""
      } you haven't asked to review you`,
      detail: `${names}${data.totals.review_targets > 3 ? " and others" : ""} rated your team 5★ — and none have been asked for a public review yet. Review Chaser can reach them in one click.`,
      wow: 30,
    });
  }

  // Lead with a problem whenever one exists — never celebrate the top cleaner while
  // something needs attention (keeps the headline consistent across pages).
  const bad = candidates.filter((c) => c.tone === "bad");
  const pool = bad.length ? bad : candidates;

  // Fallback — clean team, nothing alarming.
  let hero: Insight;
  if (pool.length) {
    hero = pool.sort((a, b) => b.wow - a.wow)[0];
  } else if (topScorer) {
    hero = {
      id: "clean-team",
      tone: "good",
      amount: null,
      amountPrefix: "",
      amountSuffix: "",
      eyebrow: "Sergio checked your team",
      headline: `No money leaks — ${topScorer.name} leads the board`,
      detail: `Refunds, comps${hasChurn ? ", and cancellations" : ""} are all low across your team. ${topScorer.name} is your top performer this period.`,
      cleaner: topScorer.name,
    };
  } else {
    hero = {
      id: "clean-team",
      tone: "good",
      amount: null,
      amountPrefix: "",
      amountSuffix: "",
      eyebrow: "Sergio checked your team",
      headline: `Your numbers are in`,
      detail: `Scroll down for the full team breakdown.`,
    };
  }

  // ---- Supporting chips (always the same three, for a stable frame) ----
  const worstScorer = [...cleaners].sort((a, b) => a.score - b.score)[0];
  const chips: Chip[] = [
    { label: "Given back this period", value: money(teamCredits), tone: teamCredits > 0 ? "bad" : "good" },
    {
      label: "Cleaner to watch",
      value: worstScorer ? worstScorer.name : "—",
      tone: "bad",
    },
    {
      label: hasChurn ? "Cleaners at risk" : "Cleaners scored",
      value: String(hasChurn ? cleaners.filter((c) => c.tier === "watch" || c.tier === "risk").length : cleaners.length),
      tone: "neutral",
    },
  ];

  return { hero, chips };
}
