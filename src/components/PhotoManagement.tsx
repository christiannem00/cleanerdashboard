"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PhotoManagement({
  initialUrl,
  userId,
}: {
  initialUrl: string;
  userId: string;
}) {
  const [savedUrl, setSavedUrl] = useState(initialUrl);
  const [draftUrl, setDraftUrl] = useState(initialUrl);
  const [editing, setEditing] = useState(!initialUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const url = draftUrl.trim();
    if (!/^https:\/\//.test(url)) {
      setError("Paste the full share link — it should start with https://");
      return;
    }
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("photo_settings")
      .upsert({ user_id: userId, showcase_url: url, updated_at: new Date().toISOString() });
    setSaving(false);
    if (dbError) {
      setError("Could not save your link — try again.");
      return;
    }
    setSavedUrl(url);
    setEditing(false);
  }

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <div className="logo">📷</div>
          <div>
            <h1>Photo Management</h1>
            <div className="sub">Your team&apos;s job photos, powered by the Showcase app</div>
          </div>
        </div>
        {savedUrl && !editing && (
          <div className="topright">
            <a className="btn" href={savedUrl} target="_blank" rel="noreferrer">
              Open gallery ↗
            </a>
            <button className="btn ghost" onClick={() => { setDraftUrl(savedUrl); setEditing(true); }}>
              Change link
            </button>
          </div>
        )}
      </header>

      {editing ? (
        <>
          <div className="insight">
            <h3>Get set up in three steps</h3>
            <p>
              Showcase is where your cleaners snap before/after photos on every job.
              Connect it once and your team&apos;s work shows up here.
            </p>
          </div>

          <div className="steps">
            <div className="step">
              <div className="stepnum">1</div>
              <div>
                <b>Download the Showcase app</b>
                <p>
                  Get Showcase from the App Store or Google Play on your phone and
                  create your company&apos;s organization.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="stepnum">2</div>
              <div>
                <b>Have your team sign up under your organization</b>
                <p>
                  Invite your cleaners from inside Showcase so every photo they take
                  lands in your company account.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="stepnum">3</div>
              <div style={{ flex: 1 }}>
                <b>Share your link here</b>
                <p>Paste your organization&apos;s share link to see your team&apos;s work.</p>
                <form onSubmit={save}>
                  <label className="field">
                    <input
                      value={draftUrl}
                      onChange={(e) => setDraftUrl(e.target.value)}
                      placeholder="https://…  (your Showcase share link)"
                    />
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn" type="submit" disabled={saving || !draftUrl.trim()}>
                      {saving ? "Saving…" : "Save link"}
                    </button>
                    {savedUrl && (
                      <button className="btn ghost" type="button" onClick={() => setEditing(false)}>
                        Cancel
                      </button>
                    )}
                  </div>
                  {error && <div className="msg err">{error}</div>}
                </form>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <iframe className="photoframe" src={savedUrl} title="Showcase gallery" />
          <p className="sub" style={{ marginTop: 10 }}>
            Gallery not loading? Some share links can&apos;t be embedded — use{" "}
            <a href={savedUrl} target="_blank" rel="noreferrer" style={{ color: "var(--brand)", fontWeight: 600 }}>
              Open gallery ↗
            </a>{" "}
            instead.
          </p>
        </>
      )}
    </div>
  );
}
