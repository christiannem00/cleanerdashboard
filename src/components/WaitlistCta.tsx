"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function WaitlistCta({ defaultEmail }: { defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [joined, setJoined] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("subscribers")
      .insert({ email, source: "waitlist" });
    setLoading(false);
    if (error) setErr(error.message);
    else setJoined(true);
  }

  return (
    <div className="card" style={{ maxWidth: 520, marginTop: 24 }}>
      {joined ? (
        <>
          <h1 style={{ fontSize: 18 }}>You&apos;re on the waitlist 🎉</h1>
          <p className="sub">We&apos;ll email <b>{email}</b> as soon as automatic runs are ready.</p>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: 18 }}>Want this to run automatically?</h1>
          <p className="sub">
            Drop your email to be added to the waitlist. Stay in control of your
            business and stop doing menial tasks.
          </p>
          <form onSubmit={join}>
            <label className="field">
              <label>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourcompany.com"
              />
            </label>
            <button className="btn dark" style={{ width: "100%", marginTop: 10 }} disabled={loading}>
              {loading ? "Adding…" : "Join the waitlist"}
            </button>
          </form>
          {err && <div className="msg err">{err}</div>}
        </>
      )}
    </div>
  );
}
