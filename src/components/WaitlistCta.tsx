"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function WaitlistCta({ defaultEmail }: { defaultEmail: string }) {
  const [joined, setJoined] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function join() {
    setErr(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("subscribers")
      .insert({ email: defaultEmail, source: "waitlist" });
    setLoading(false);
    if (error) setErr(error.message);
    else setJoined(true);
  }

  return (
    <div className="card" style={{ maxWidth: 520, marginTop: 24 }}>
      {joined ? (
        <>
          <h1 style={{ fontSize: 18 }}>You&apos;re on the waitlist 🎉</h1>
          <p className="sub">We&apos;ll email you as soon as automatic runs are ready.</p>
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
