"use client";
import { useEffect, useRef, useState } from "react";
import { pickInsight } from "@/lib/insights";
import type { Dataset } from "@/lib/compute";

// The "aha" moment: after a CSV upload, before the table, hand the operator ONE
// surprising, dollar-denominated truth about their business — with a count-up so
// the number lands. `onSeeBreakdown` scrolls to the full scoreboard when present.
export default function InsightCard({ data, onSeeBreakdown }: { data: Dataset; onSeeBreakdown?: () => void }) {
  const { hero, chips } = pickInsight(data);
  const target = hero.amount ?? 0;
  const [n, setN] = useState(hero.amount == null ? 0 : 0);
  const [shown, setShown] = useState(false);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    // Fade the card in, then count the headline figure up over ~1.1s (ease-out).
    const t = setTimeout(() => setShown(true), 30);
    if (hero.amount == null) return () => clearTimeout(t);
    const dur = 1100;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (start == null) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(target * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      clearTimeout(t);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, hero.amount]);

  const bad = hero.tone === "bad";
  const figure =
    hero.amount == null
      ? null
      : hero.amountPrefix + Math.round(n).toLocaleString("en-US") + hero.amountSuffix;

  return (
    <div className={"insight" + (bad ? " bad" : " good") + (shown ? " in" : "")} data-section="Headline insight">
      <div className="insight-eyebrow">
        <span className="insight-spark">{bad ? "💡" : "✨"}</span>
        {hero.eyebrow}
      </div>

      {figure ? (
        <div className="insight-hero">
          <span className="insight-figure">{figure}</span>
          <span className="insight-head">{hero.headline}</span>
        </div>
      ) : (
        <div className="insight-head solo">{hero.headline}</div>
      )}

      <p className="insight-detail">{hero.detail}</p>

      <div className="insight-chips">
        {chips.map((c) => (
          <div className={"insight-chip " + c.tone} key={c.label}>
            <span className="ic-v">{c.value}</span>
            <span className="ic-l">{c.label}</span>
          </div>
        ))}
      </div>

      {onSeeBreakdown && (
        <button className="insight-cta" onClick={onSeeBreakdown}>
          See the full breakdown ↓
        </button>
      )}
    </div>
  );
}
