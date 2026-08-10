"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [notify, setNotify] = useState(true);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const supabase = createClient();

    // Capture the "keep me in the loop" opt-in up front (own table, anon insert).
    if (notify && email) {
      await supabase.from("subscribers").insert({ email, source: "onboarding" });
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <div className="center">
      <div className="card">
        <div className="brand" style={{ marginBottom: 16 }}>
          <div className="logo">S</div>
          <div>
            <h1 style={{ fontSize: 20 }}>Sergio</h1>
            <p className="sub" style={{ margin: 0 }}>Cleaner Dashboard · Review Chaser · Photos — one login</p>
          </div>
        </div>
        {sent ? (
          <>
            <h1>Check your email</h1>
            <p className="sub">We sent a sign-in link to <b>{email}</b>. Click it to log in to Sergio — no password needed.</p>
            <button className="linkbtn" onClick={() => setSent(false)}>Use a different email</button>
          </>
        ) : (
          <>
            <h1>Sign in to Sergio</h1>
            <p className="sub">Enter your work email and we&apos;ll send you a one-time sign-in link.</p>
            <form onSubmit={sendLink}>
              <label className="field">
                <label>Email</label>
                <input type="email" required placeholder="you@yourcompany.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="optin">
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                <span>Stay in control of your business. Check here to be the first to know of new Sergio features.</span>
              </label>
              <button className="btn dark" style={{ width: "100%", marginTop: 14 }} disabled={loading}>
                {loading ? "Sending…" : "Send sign-in link"}
              </button>
            </form>
            {err && <div className="msg err">{err}</div>}
          </>
        )}
      </div>
    </div>
  );
}
