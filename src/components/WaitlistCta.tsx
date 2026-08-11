"use client";
import { useState } from "react";

export default function WaitlistCta({ initialJoined = false }: { defaultEmail?: string; initialJoined?: boolean }) {
  const [joined, setJoined] = useState(initialJoined);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function join() {
    setErr(null);
    setLoading(true);
    try {
      // Inserts into subscribers AND emails the admin; idempotent.
      const r = await fetch("/api/waitlist", { method: "POST" });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "failed");
      setJoined(true);
    } catch (e) {
      setErr("Could not join — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, marginTop: 24 }}>
      {joined ? (
        <>
          <h1 style={{ fontSize: 18 }}>You&apos;re on the waitlist 🎉</h1>
          <p className="sub">We&apos;ll email you as soon as a spot opens in the beta.</p>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: 18 }}>Want this to run automatically on a rolling basis?</h1>
          <p className="sub">
            Stay in control of your business and stop doing menial tasks.
          </p>
          <button className="btn dark" style={{ width: "100%", marginTop: 10 }} disabled={loading} onClick={join}>
            {loading ? "Adding…" : "Join the waitlist"}
          </button>
          {err && <div className="msg err">{err}</div>}
        </>
      )}
    </div>
  );
}
