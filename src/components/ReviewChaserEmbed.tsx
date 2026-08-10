"use client";

import { useEffect, useState } from "react";

type Phase = "loading" | "ready" | "setup" | "error";

export default function ReviewChaserEmbed() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [reviewUrl, setReviewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/rc/sso", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.ok) setPhase("ready");
        else if (d.needsSetup) setPhase("setup");
        else {
          setError(d.error || "Could not connect to Review Chaser.");
          setPhase("error");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not connect to Review Chaser.");
          setPhase("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      if (d.ok) setPhase("ready");
      else setError(d.error || "Could not create your Review Chaser account.");
    } catch {
      setError("Could not create your Review Chaser account.");
    } finally {
      setSaving(false);
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
                <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>
                  Business name
                </span>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Village Home Cleaning"
                  required
                />
              </label>
              <label className="field">
                <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>
                  Google review link (optional)
                </span>
                <input
                  value={reviewUrl}
                  onChange={(e) => setReviewUrl(e.target.value)}
                  placeholder="https://g.page/r/..."
                />
              </label>
              <button className="btn" type="submit" disabled={saving || !businessName.trim()}>
                {saving ? "Launching…" : "Launch ReviewChaser"}
              </button>
              {error && <div className="msg err">{error}</div>}
            </form>
          </div>
        </div>
      )}

      {phase === "error" && <div className="msg err">{error}</div>}
    </div>
  );
}
