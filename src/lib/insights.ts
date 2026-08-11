// Turns a scored Dataset into ONE surprising, dollar-denominated headline
// ("Sergio found $X …") plus a few supporting stat chips. Pure + deterministic
// so the same upload always reveals the same insight. Used on the upload preview
// (instant, pre-save) and at the top of the saved dashboard.
import type { Dataset, Cleaner } from "./compute";

export type Chip = { label: string; value: string; tone: "good" | "bad" | "neutral" };

export type Insight = {
  id: "leak" | "expensive-earner" | "churn" | "team-leak" | "quiet-star" | "clean-team";
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

// Scale a period total into a monthly run-rate using the same 30-day
// normalization compute.ts already applied to revenue, then annualize.
function annualizer(data: Dataset) {
  const rev = data.cleaners.reduce((s, c) => s + c.revenue, 0);
  const revMo = data.cleaners.reduce((s, c) => s + c.rev_mo, 0);
  const factor = rev > 0 ? revMo / rev : 1;
  return (periodTotal: number) => periodTotal * factor * 12;
}

export function pickInsight(data: Dataset): InsightResult {
  const cleaners = data.cleaners.filter((c) => c.jobs > 0);
  const annual = annualizer(data);
  const teamCredits = cleaners.reduce((s, c) => s + c.credits, 0);
  const hasChurn = cleaners.some((c) => c.tot_book > 0);

  const byCredits = [...cleaners].sort((a, b) => b.credits - a.credits);
  const byRevMo = [...cleaners].sort((a, b) => b.rev_mo - a.rev_mo);
  const byScore = [...cleaners].sort((a, b) => b.score - a.score);
  const topEarner = byRevMo[0];
  const topScorer = byScore[0];
  const worstLeaker = byCredits[0];

  // ---- Candidate insights, each with a "wow" weight; highest wins. ----
  const candidates: (Insight & { wow: number })[] = [];

  // A. Concentrated leak — one cleaner holds a big share of all money given back.
  if (teamCredits >= 40 && worstLeaker && worstLeaker.credits > 0) {
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

  // Fallback — clean team, nothing alarming.
  let hero: Insight;
  if (candidates.length) {
    hero = candidates.sort((a, b) => b.wow - a.wow)[0];
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
  const chips: Chip[] = [
    { label: "Given back this period", value: money(teamCredits), tone: teamCredits > 0 ? "bad" : "good" },
    {
      label: "Top performer",
      value: topScorer ? topScorer.name : "—",
      tone: "good",
    },
    {
      label: hasChurn ? "Cleaners to watch" : "Cleaners scored",
      value: String(hasChurn ? cleaners.filter((c) => c.tier === "watch" || c.tier === "risk").length : cleaners.length),
      tone: hasChurn ? "neutral" : "neutral",
    },
  ];

  return { hero, chips };
}
