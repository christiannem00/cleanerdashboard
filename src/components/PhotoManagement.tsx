"use client";

import { useState } from "react";

const SHOWCASE_URL = "https://showcase.serviche.com/";

export default function PhotoManagement({
  initialUrl,
}: {
  initialUrl: string;
  userId?: string;
}) {
  // Once they've connected before (or click Sign in), go straight to the app window.
  const [showApp, setShowApp] = useState(Boolean(initialUrl));

  if (showApp) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "14px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <b style={{ fontSize: 15 }}>📷 Photo Management — Showcase</b>
          <div style={{ display: "flex", gap: 8 }}>
            <a className="btn" href={SHOWCASE_URL} target="_blank" rel="noreferrer">Open full screen ↗</a>
            <button className="btn ghost" onClick={() => setShowApp(false)}>Setup steps</button>
          </div>
        </div>
        <iframe
          className="rcframe"
          style={{ minHeight: "calc(100vh - 90px)" }}
          src={SHOWCASE_URL}
          title="Showcase"
          allow="camera; clipboard-write"
        />
        <p className="sub" style={{ marginTop: 8 }}>
          Trouble signing in inside this window? Use{" "}
          <a href={SHOWCASE_URL} target="_blank" rel="noreferrer" style={{ color: "var(--brand)", fontWeight: 600 }}>
            Open full screen ↗
          </a>{" "}
          — some sign-in flows only work in a full browser tab.
        </p>
      </div>
    );
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
      </header>

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
              Get Showcase on your phone and create your company&apos;s
              organization.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <a
                className="btn dark"
                href="https://apps.apple.com/us/app/showcase-before-after-photos/id6757687914"
                target="_blank"
                rel="noreferrer"
              >
                 App Store
              </a>
              <a
                className="btn dark"
                href="https://play.google.com/store/apps/details?id=com.vhc.showcase&hl=en_US"
                target="_blank"
                rel="noreferrer"
              >
                ▶ Google Play
              </a>
            </div>
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
            <b>Sign in</b>
            <p>Sign in to Showcase to see your team&apos;s work.</p>
            <button className="btn" style={{ marginTop: 10 }} onClick={() => setShowApp(true)}>
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
