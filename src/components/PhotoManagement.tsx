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
            <ul className="pmlist">
              <li>The web browser is the administrator&apos;s view — all photos taken by your staff will appear here.</li>
              <li>No more low-quality photos sent by text, email, AirDrop, etc.</li>
              <li>Include Showcase as part of your cleaner&apos;s checklist to complete before they hit &quot;clock out&quot;, so it&apos;s mandatory for them to get paid.</li>
              <li>Never travel to a site to review work again.</li>
            </ul>
            <a className="btn" style={{ marginTop: 10, display: "inline-block" }} href={SHOWCASE_URL} target="_blank" rel="noreferrer">
              Sign in ↗
            </a>
          </div>
        </div>
      </div>

      <div className="pmgrid">
        {[
          ["🎯", "Perfectly aligned shots", "A ghost overlay of the “before” photo and on-screen level guides line up every “after” shot, so your comparisons look clean, not crooked."],
          ["📶", "Never lose a shot", "No signal on the job site? Photos queue safely on the phone and upload automatically the moment your crew is back online."],
          ["✅", "Verified provenance", "GPS, timestamp, and device data are recorded on every capture, so your before/afters are provably real, not pulled off the internet."],
          ["🧩", "One-line website widget", "Drop a single line of code on your site and your best transformations appear in an interactive before/after slider."],
          ["🖼️", "Public proof gallery", "Every account gets a shareable, search-friendly gallery page that shows off your verified work to customers and search engines."],
          ["🎬", "Videos & bulk export", "Turn photo pairs into shareable before/after videos, or bulk-export your library whenever you need it."],
        ].map(([icon, title, desc]) => (
          <div className="pmtile" key={title}>
            <div className="pmicon">{icon}</div>
            <b>{title}</b>
            <p>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
