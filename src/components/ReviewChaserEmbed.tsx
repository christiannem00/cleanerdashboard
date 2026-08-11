"use client";

import { useCallback, useEffect, useState } from "react";

export type PickClient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  ref: string;
  date: string;
  last: string;
  rating: number | null;
  suppress: boolean;
  recommended: boolean;
};

type Phase = "loading" | "ready" | "setup" | "pick" | "error";

export default function ReviewChaserEmbed({ candidates = [] }: { candidates?: PickClient[] }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [reviewUrl, setReviewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  // Picker selection — default to the recommended (happy / no-complaint) clients.
  const [picked, setPicked] = useState<Set<string>>(new Set(candidates.filter((c) => c.recommended).map((c) => c.id)));
  const [adding, setAdding] = useState(false);

  // After SSO, decide: empty campaign + we have candidates → show the picker;
  // otherwise drop straight into the ReviewChaser dashboard.
  const resolveReady = useCallback(async () => {
    try {
      const r = await fetch("/api/dashboard-data");
      const d = await r.json().catch(() => ({}));
      const hasCustomers = Array.isArray(d?.customers) && d.customers.length > 0;
      setPhase(!hasCustomers && candidates.length > 0 ? "pick" : "ready");
    } catch {
      setPhase("ready");
    }
  }, [candidates.length]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/rc/sso", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.ok) resolveReady();
        else if (d.needsSetup) setPhase("setup");
        else { setError(d.error || "Could not connect to Review Chaser."); setPhase("error"); }
      })
      .catch(() => { if (!cancelled) { setError("Could not connect to Review Chaser."); setPhase("error"); } });
    return () => { cancelled = true; };
  }, [resolveReady]);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/rc/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, googleReviewUrl: reviewUrl || null }),
      });
      const d = await r.json();
      if (d.ok) resolveReady();
      else setError(d.error || "Could not create your Review Chaser account.");
    } catch {
      setError("Could not create your Review Chaser account.");
    } finally {
      setSaving(false);
    }
  }

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  const setAll = (on: boolean) => setPicked(on ? new Set(candidates.filter((c) => !c.suppress).map((c) => c.id)) : new Set());

  async function addToCampaign() {
    const chosen = candidates.filter((c) => picked.has(c.id));
    if (!chosen.length) return;
    setAdding(true);
    setError("");
    try {
      const r = await fetch("/api/rc/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: chosen.map((c) => ({ ref: c.ref, name: c.name, email: c.email, phone: c.phone, date: c.date })),
        }),
      });
      const d = await r.json();
      if (d.ok) setPhase("ready");
      else setError(d.error || "Could not add customers — please try again.");
    } catch {
      setError("Could not add customers — please try again.");
    } finally {
      setAdding(false);
    }
  }

  if (phase === "ready") {
    return (
      <div className="rcwrap">
        <iframe className="rcframe" src="/rc-app" title="Review Chaser" />
      </div>
    );
  }

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <div className="logo">⭐</div>
          <div>
            <h1>Review Chaser</h1>
            <div className="sub">Automatic Google-review follow-ups for your customers</div>
          </div>
        </div>
      </header>

      {phase === "loading" && <div className="rcload">Signing you into Review Chaser…</div>}

      {phase === "setup" && (
        <div className="center" style={{ minHeight: "auto", paddingTop: 40 }}>
          <div className="card">
            <h1>Set up Review Chaser</h1>
            <p className="sub">One-time setup.</p>
            <form onSubmit={createAccount}>
              <label className="field">
                <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Business name</span>
                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Village Home Cleaning" required />
              </label>
              <label className="field">
                <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>Google review link (optional)</span>
                <input value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} placeholder="https://g.page/r/..." />
              </label>
              <button className="btn" type="submit" disabled={saving || !businessName.trim()}>
                {saving ? "Launching…" : "Launch ReviewChaser"}
              </button>
              {error && <div className="msg err">{error}</div>}
            </form>
          </div>
        </div>
      )}

      {phase === "pick" && (
        <div className="rcpick">
          <div className="rcpick-head">
            <h2>Who should we add to your review campaign?</h2>
            <p className="sub">
              Sergio will text these clients asking for a Google review and follow up until they respond. Your happy
              clients are pre-selected; anyone with a recent complaint or refund is left out so you don&apos;t ask an
              unhappy customer for a public review.
            </p>
            <div className="rcpick-actions">
              <button className="linkbtn" onClick={() => setAll(true)}>Select all</button>
              <span className="mut">·</span>
              <button className="linkbtn" onClick={() => setAll(false)}>Clear</button>
              <span className="rcpick-count">{picked.size} selected</span>
            </div>
          </div>

          <div className="rcpick-list">
            {candidates.map((c) => (
              <label className={"rcpick-row" + (c.suppress ? " sup" : "")} key={c.id}>
                <input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} />
                <div className="rcpick-main">
                  <b>{c.name}</b>
                  <small>
                    {c.phone}
                    {c.last ? ` · last clean ${c.last}` : ""}
                    {c.rating != null ? ` · ${c.rating}★` : ""}
                  </small>
                </div>
                {c.suppress ? (
                  <span className="rcpick-tag bad">recent complaint — skip</span>
                ) : c.recommended && c.rating ? (
                  <span className="rcpick-tag good">happy client</span>
                ) : null}
              </label>
            ))}
          </div>

          {error && <div className="msg err" style={{ maxWidth: 520 }}>{error}</div>}
          <div className="rcpick-foot">
            <button className="btn dark" disabled={adding || picked.size === 0} onClick={addToCampaign}>
              {adding ? "Adding…" : `Add ${picked.size} client${picked.size === 1 ? "" : "s"} to campaign →`}
            </button>
            <span className="mut" style={{ fontSize: 12 }}>Select at least one client to start your campaign.</span>
          </div>
        </div>
      )}

      {phase === "error" && <div className="msg err">{error}</div>}
    </div>
  );
}
