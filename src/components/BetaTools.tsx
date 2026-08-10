"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// The rest of the VHC tools suite — not live in the portal yet. Clicking a
// grayed-out entry opens an info modal with a "Request to join beta" button;
// requests land in the feedback table (kind=beta_request, context=tool id).
const TOOLS = [
  { id: "inbox", icon: "✉️", name: "AI Inbox", desc: "Drafts every reply for text and email — you just approve and send." },
  { id: "soul", icon: "🔮", name: "Ask Your Business", desc: "“Did Jordan Ford say why they canceled?” It knows why. Ask any question about your business and get a real answer from your own data." },
  { id: "dispatch", icon: "🚨", name: "Dispatch Recovery", desc: "A cleaner calls out and it re-books the day's schedule for you." },
  { id: "followups", icon: "📬", name: "Follow-ups", desc: "Every quote and cold lead chased automatically. Never drop another lead." },
  { id: "memory", icon: "🧠", name: "Client Memory", desc: "Remembers who's allergic to cats and hates Mondays. All the little things for a flawless visit." },
  { id: "digest", icon: "📰", name: "Daily Digest", desc: "A daily email of what you need to do today, and how to grow the business based on where you are right now." },
  { id: "churn", icon: "📉", name: "Churn Radar", desc: "Flags the clients about to ghost you — before they do." },
  { id: "payroll", icon: "💳", name: "Charge & Payroll", desc: "Charges cards. Pays cleaners. In one place." },
  { id: "screening", icon: "🧑‍💼", name: "Applicant Screening", desc: "Screens applicants and gives you a shortlist of who to interview." },
];

export default function BetaTools() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [requested, setRequested] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const open = TOOLS.find((t) => t.id === openId);

  async function requestBeta(toolId: string, toolName: string) {
    setSending(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Please sign in again.");
      setSending(false);
      return;
    }
    const { error: dbError } = await supabase.from("feedback").insert({
      user_id: user.id,
      email: user.email,
      kind: "beta_request",
      context: `portal-tool:${toolId}`,
      message: `Requested beta access to ${toolName} from the Sergio Lite portal`,
    });
    setSending(false);
    if (dbError) {
      setError("Could not send your request — try again.");
      return;
    }
    setRequested((r) => ({ ...r, [toolId]: true }));
  }

  return (
    <>
      <div className="sidelabel">Coming soon</div>
      <div className="sidenav">
        {TOOLS.map((t) => (
          <button key={t.id} className="navlink beta" onClick={() => { setOpenId(t.id); setError(""); }}>
            <span className="navic">{t.icon}</span>
            <span className="betaname">{t.name}</span>
            {requested[t.id] && <span className="betatick">✓</span>}
          </button>
        ))}
      </div>

      {open && (
        <div className="ovl" onClick={() => setOpenId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {open.icon} {open.name} <span className="betachip">Beta</span>
            </h3>
            <p className="ctx">{open.desc}</p>
            <p className="ctx">
              This tool isn&apos;t switched on for your account yet. Request access and
              we&apos;ll reach out as soon as a beta spot opens up.
            </p>
            <div className="row">
              <button className="btn ghost" onClick={() => setOpenId(null)}>Close</button>
              {requested[open.id] ? (
                <button className="btn" disabled>Requested ✓</button>
              ) : (
                <button className="btn" disabled={sending} onClick={() => requestBeta(open.id, open.name)}>
                  {sending ? "Sending…" : "Request to join beta"}
                </button>
              )}
            </div>
            {error && <div className="msg err">{error}</div>}
          </div>
        </div>
      )}
    </>
  );
}
