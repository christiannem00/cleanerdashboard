"use client";

const SHOWCASE_URL = "https://showcase.serviche.com/";

export default function PhotoManagement(_props: { initialUrl?: string; userId?: string }) {
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
        <div className="topright">
          <a className="btn" href={SHOWCASE_URL} target="_blank" rel="noreferrer">
            Open Showcase ↗
          </a>
        </div>
      </header>

      <div className="insight">
        <h3>Get set up in three steps</h3>
        <p>
          Showcase is where your cleaners snap before/after photos on every job.
          Connect it once and your team&apos;s work shows up there.
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
            <a className="btn" style={{ marginTop: 10, display: "inline-block" }} href={SHOWCASE_URL} target="_blank" rel="noreferrer">
              Sign in ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
