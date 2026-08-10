"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Cleaner, Dataset } from "@/lib/compute";

const money = (n: number) => "$" + (n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const pct1 = (n: number) => (n || 0).toFixed(1) + "%";
const tierColor: Record<string, string> = { star: "var(--star)", solid: "var(--solid)", watch: "var(--watch)", risk: "var(--risk)" };
const tierBg: Record<string, string> = { star: "#0f9d58", solid: "#1a73e8", watch: "#e8930c", risk: "#d93025" };
const initials = (n: string) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

type Tab = "score" | "churn" | "credits" | "complaints" | "slack";
type FB = { open: boolean; kind: "note" | "beta_request"; context: string; message: string; status: "" | "saving" | "ok" | "err" };

export default function Dashboard({ data, uploadId }: { data: Dataset; uploadId?: string }) {
  const [tab, setTab] = useState<Tab>("score");
  const [sortKey, setSortKey] = useState<keyof Cleaner>("score");
  const [dir, setDir] = useState(-1);
  const [fb, setFb] = useState<FB>({ open: false, kind: "note", context: "", message: "", status: "" });
  const t = data.totals;

  function openFeedback(kind: FB["kind"], context: string) {
    setFb({ open: true, kind, context, message: "", status: "" });
  }
  function onContextMenu(e: React.MouseEvent) {
    const el = (e.target as HTMLElement).closest("[data-cleaner]") as HTMLElement | null;
    e.preventDefault();
    openFeedback("note", el?.dataset.cleaner ? `Note on ${el.dataset.cleaner}` : "General note");
  }
  async function submitFeedback() {
    setFb((f) => ({ ...f, status: "saving" }));
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setFb((f) => ({ ...f, status: "err" })); return; }
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id, email: user.email, kind: fb.kind,
      context: fb.context, message: fb.message, upload_id: uploadId ?? null,
    });
    setFb((f) => ({ ...f, status: error ? "err" : "ok" }));
  }

  const kpis: [string, string | number, string][] = [
    ["Cleaners", t.cleaners, `${t.active_cleaners} active`],
    ["Jobs completed", t.jobs, "this period"],
    ["Revenue / mo", money(t.rev_mo), "run-rate"],
    ["Recurring share", t.recurring_share + "%", "of jobs recurring"],
    ["Complaints", t.total_complaints, "OpenPhone · Limited Beta"],
    ["Client credits", money(t.credits), "refunds + comps"],
  ];

  const sorted = [...data.cleaners].sort((a, b) => {
    let x: any = a[sortKey], y: any = b[sortKey];
    x = x == null ? -1 : x; y = y == null ? -1 : y;
    return (x < y ? -1 : x > y ? 1 : 0) * dir;
  });
  const onSort = (k: keyof Cleaner) => {
    if (sortKey === k) setDir(-dir);
    else { setSortKey(k); setDir(k === "name" ? 1 : -1); }
  };

  const bar = (list: Cleaner[], key: keyof Cleaner, fmt: (v: number) => string, color: (c: Cleaner) => string) => {
    const mx = Math.max(...list.map((x) => (x[key] as number) || 0)) || 1;
    return list.map((c) => (
      <div className="barrow" key={c.name} data-cleaner={c.name}>
        <div className="nm">{c.name}</div>
        <div className="track"><i style={{ width: Math.max(2, (100 * ((c[key] as number) || 0)) / mx) + "%", background: color(c) }} /></div>
        <div className="vv">{fmt(c[key] as number)}</div>
      </div>
    ));
  };

  const H: [keyof Cleaner, React.ReactNode, string][] = [
    ["rank", "#", ""], ["name", "Cleaner", "l"], ["jobs", "Jobs", ""],
    ["rev_mo", "Rev / mo", ""], ["canc_rate", "Churn %*", ""],
    ["credits", "Appeasements", ""],
    ["complaint_per_clean", <>Complaints /<br />Clean <span className="betachip">Limited Beta</span></>, "samp"],
    ["score", "Score", ""],
  ];

  return (
    <div onContextMenu={onContextMenu}>
      <div className="fbbar">
        <span className="hint">Right-click anywhere to leave a note.</span>
        <button className="btn ghost" onClick={() => openFeedback("note", "General note")}>💬 Give feedback</button>
      </div>

      <div className="kpis">
        {kpis.map((k) => (
          <div className="kpi" key={k[0]}>
            <div className="l">{k[0]}</div>
            <div className="v">{k[1]}</div>
            <div className="m">{k[2]}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {([["score", "🏆 Scoreboard"], ["churn", "📉 Churn"], ["credits", "💸 Refunds & comps"], ["complaints", "📞 Complaints"], ["slack", "🚩 Who's slacking"]] as [Tab, string][]).map(([v, label]) => (
          <div key={v} className={"tab" + (tab === v ? " active" : "")} onClick={() => setTab(v)}>{label}</div>
        ))}
      </div>

      {tab === "score" && (
        <div className="panel">
          <h2>Team scoreboard <span className="mut" style={{ fontWeight: 400 }}>— ranked by composite performance score</span></h2>
          <div className="legend">
            <span><span className="dot" style={{ background: "var(--star)" }} />Star ≥75</span>
            <span><span className="dot" style={{ background: "var(--solid)" }} />Solid 50–74</span>
            <span><span className="dot" style={{ background: "var(--watch)" }} />Watch 30–49</span>
            <span><span className="dot" style={{ background: "var(--risk)" }} />At risk &lt;30</span>
          </div>
          <div style={{ overflow: "auto", maxHeight: 620 }}>
            <table>
              <thead>
                <tr>{H.map((h) => <th key={String(h[0])} className={h[2]} onClick={() => onSort(h[0])}>{h[1]}</th>)}</tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <tr key={c.name} data-cleaner={c.name}>
                    <td><span className="rk">{c.rank}</span></td>
                    <td className="name l">{c.name}{c.is_new && <span className="newb">new</span>}<small>{c.clients} clients{c.Status === "Inactive" ? " · left the team" : ""}</small></td>
                    <td>{c.jobs}</td>
                    <td>{money(c.rev_mo)}</td>
                    <td className={c.canc_rate > 7 ? "warn" : ""}>{pct1(c.canc_rate)}</td>
                    <td className={c.credits > 50 ? "warn" : ""}>{c.credits > 0 ? money(c.credits) : "—"}</td>
                    <td className="samptd">{c.complaint_per_clean.toFixed(2)}</td>
                    <td><div className="scorecell"><div className="sbar"><i style={{ width: c.score + "%", background: tierColor[c.tier] }} /></div><span className="scnum">{c.score}</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="section-note">Score = 40% complaints-per-clean · 25% churn (cancellations) · 25% refunds+comps per job · 10% recurring retention. Revenue is a 30-day run-rate.<br /><span style={{ color: "#9aa1ab" }}>*Churn = lifetime cancelled ÷ total bookings (a cancellation proxy until the paused/cancelled recurring export is loaded).</span></div>
        </div>
      )}

      {tab === "churn" && (
        <div className="panel">
          <h2>Churn rate by cleaner <span className="mut" style={{ fontWeight: 400 }}>(cancellation proxy)</span></h2>
          {bar([...data.cleaners].sort((a, b) => b.canc_rate - a.canc_rate), "canc_rate", (v) => pct1(v), (c) => (c.canc_rate > 7 ? "#d93025" : c.canc_rate > 5 ? "#e8930c" : "#0f9d58"))}
          <div className="section-note">Lifetime cancelled ÷ total bookings per cleaner. True client churn — a recurring client who quits after a bad clean — is unlocked once the cancelled/paused recurring export is connected.</div>
        </div>
      )}

      {tab === "credits" && (
        <div className="panel">
          <h2>Refunds &amp; comps — total handed back, this period</h2>
          {bar([...data.cleaners].sort((a, b) => b.credits - a.credits), "credits", (v) => (v > 0 ? money(v) : "$0"), (c) => (c.credits > 100 ? "#d93025" : c.credits > 0 ? "#e8930c" : "#0f9d58"))}
          <div className="section-note">Refunds + negative price adjustments (comps) over the window — hard dollars given back to clients, a quality signal that doesn&apos;t depend on ratings.</div>
        </div>
      )}

      {tab === "complaints" && (
        <div className="panel">
          <h2>
            Complaints / Clean <span className="betachip">Limited Beta</span>
            <button className="reqbtn" style={{ marginLeft: "auto" }} onClick={() => openFeedback("beta_request", "Complaints per Clean")}>Request to be added to the beta for this feature</button>
          </h2>
          {bar([...data.cleaners].sort((a, b) => b.complaint_per_clean - a.complaint_per_clean), "complaint_per_clean", (v) => v.toFixed(2), (c) => (c.complaint_per_clean > 0.2 ? "#d93025" : c.complaint_per_clean > 0.1 ? "#e8930c" : "#7c3aed"))}
          <div className="section-note"><b>How it works:</b> Sergio pulls inbound calls &amp; texts from OpenPhone (Quo), flags complaints via keywords + AI-summary sentiment, matches the sender&apos;s phone to the client, and attributes it to the cleaner who serviced them in the prior ~48h — a complaint rate covering every job. This feature is in limited beta; request access above.</div>
        </div>
      )}

      {tab === "slack" && (
        <div className="panel">
          <h2>🚩 Flagged for a conversation <span className="mut" style={{ fontWeight: 400 }}>— lowest composite scores</span></h2>
          {[...data.cleaners].sort((a, b) => a.score - b.score).slice(0, 4).map((c) => {
            const chips: [string, string][] = [];
            if (c.canc_rate > 7) chips.push(["bad", pct1(c.canc_rate) + " cancel rate"]);
            if (c.complaint_per_clean > 0.15) chips.push(["", c.complaint_per_clean.toFixed(2) + " complaints/clean"]);
            if (c.refund_ct > 0) chips.push(["bad", c.refund_ct + " refund" + (c.refund_ct > 1 ? "s" : "") + " (" + money(c.refunds) + ")"]);
            if (c.Status === "Inactive") chips.push(["bad", "already left"]);
            if (!chips.length) chips.push(["", "watch — trending down"]);
            const reasons: string[] = [];
            if (c.complaint_per_clean > 0.15) reasons.push("highest complaint density on the team");
            if (c.canc_rate > 7) reasons.push("elevated cancellations");
            if (c.refund_ct > 0 || c.comp_ct > 0) reasons.push("gave money back to clients");
            if (c.Status === "Inactive") reasons.push("already churned off the roster");
            const why = reasons.length ? reasons.join(", ").replace(/^./, (s) => s.toUpperCase()) + "." : "Slipping on the composite — worth a check-in.";
            return (
              <div className="flag" key={c.name} data-cleaner={c.name}>
                <div className="ava" style={{ background: tierBg[c.tier] }}>{initials(c.name)}</div>
                <div className="body">
                  <b>{c.name}</b> <span className={"tierb t-" + c.tier}>{c.tier}</span> · score {c.score}
                  <div className="why">{why}</div>
                  <div className="chips">{chips.map((x, i) => <span key={i} className={"chip " + x[0]}>{x[1]}</span>)}</div>
                </div>
              </div>
            );
          })}
          <div className="section-note">Ranked by composite score. Right-click a cleaner to leave a private note.</div>
        </div>
      )}

      {fb.open && (
        <div className="ovl" onClick={() => setFb((f) => ({ ...f, open: false }))} onContextMenu={(e) => e.preventDefault()}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {fb.status === "ok" ? (
              <>
                <h3>{fb.kind === "beta_request" ? "You're on the list" : "Thanks — saved"}</h3>
                <p className="ctx">{fb.kind === "beta_request" ? "We'll reach out about Complaints / Clean beta access." : "Your note is saved to your account."}</p>
                <div className="row"><button className="btn dark" onClick={() => setFb((f) => ({ ...f, open: false }))}>Close</button></div>
              </>
            ) : (
              <>
                <h3>{fb.kind === "beta_request" ? "Request beta access" : "Provide feedback"}</h3>
                <p className="ctx">{fb.context}</p>
                <textarea
                  autoFocus
                  placeholder={fb.kind === "beta_request" ? "Anything you want the team to know? (optional)" : "What's on your mind?"}
                  value={fb.message}
                  onChange={(e) => setFb((f) => ({ ...f, message: e.target.value }))}
                />
                {fb.status === "err" && <div className="msg err">Couldn&apos;t save — please try again.</div>}
                <div className="row">
                  <button className="btn ghost" onClick={() => setFb((f) => ({ ...f, open: false }))}>Cancel</button>
                  <button className="btn dark" onClick={submitFeedback} disabled={fb.status === "saving"}>
                    {fb.status === "saving" ? "Sending…" : fb.kind === "beta_request" ? "Request access" : "Send feedback"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
