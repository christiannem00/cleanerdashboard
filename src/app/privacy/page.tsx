import Link from "next/link";

export const metadata = { title: "Privacy Policy — Sergio Lite" };

export default function PrivacyPage() {
  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <header className="top">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <h1>Privacy Policy</h1>
            <div className="sub">Sergio Lite · last updated August 10, 2026</div>
          </div>
        </div>
        <Link className="btn ghost" href="/login">← Back</Link>
      </header>

      <div className="card" style={{ maxWidth: "none", fontSize: 14, lineHeight: 1.7 }}>
        <p>
          Sergio Lite (&quot;Sergio&quot;, &quot;we&quot;) is operated by Serviche. This page explains what
          information the app handles, where it lives, and what we do — and don&apos;t do — with it.
        </p>

        <h2 style={{ fontSize: 16, marginTop: 22 }}>What we collect</h2>
        <ul style={{ paddingLeft: 20, display: "grid", gap: 8, marginTop: 8 }}>
          <li><b>Your account:</b> the email address you sign in with (we use passwordless sign-in links; we never store a password), and your onboarding answers (phone service and booking software).</li>
          <li><b>Cleaner Dashboard uploads:</b> the BookingKoala CSVs you upload are parsed <b>in your own browser</b>. When you hit Save, the computed performance summary (cleaner names, job counts, revenue and refund figures) is stored to your account so you can revisit it.</li>
          <li><b>Review Chaser:</b> your business name, Google review link, and the customer contact details (names, phone numbers, emails, booking references) you import so review requests can be sent on your behalf, plus the message history of those requests.</li>
          <li><b>Photos:</b> job photos are handled by the separate Showcase app under its own account and terms; Sergio only links you there.</li>
          <li><b>Usage &amp; diagnostics:</b> we use Microsoft Clarity to understand how the app is used (session replays, clicks, scrolls — see Microsoft&apos;s privacy documentation), and we log in-app errors to fix problems quickly.</li>
        </ul>

        <h2 style={{ fontSize: 16, marginTop: 22 }}>How it&apos;s used</h2>
        <ul style={{ paddingLeft: 20, display: "grid", gap: 8, marginTop: 8 }}>
          <li>To provide the product: score your team, chase your reviews, show your photos.</li>
          <li>To notify you (sign-in links, review-request receipts) and to notify us when something needs attention (a signup, a support request, an error).</li>
          <li><b>We do not sell your data. We do not share it with third parties for marketing. Your business data is never shown to another customer.</b></li>
        </ul>

        <h2 style={{ fontSize: 16, marginTop: 22 }}>Where it lives &amp; how it&apos;s protected</h2>
        <ul style={{ paddingLeft: 20, display: "grid", gap: 8, marginTop: 8 }}>
          <li>Data is stored with Supabase (database) and served via Vercel (hosting), both over HTTPS. Emails are delivered by Resend.</li>
          <li>Every record is tied to your account and protected by database row-level security — each customer can only ever read their own data. We verify this isolation as part of our release process.</li>
          <li>Sign-in is by emailed one-time link only, so there is no password to leak or reuse.</li>
        </ul>

        <h2 style={{ fontSize: 16, marginTop: 22 }}>Your customers&apos; data</h2>
        <p style={{ marginTop: 8 }}>
          When you import customer contacts into Review Chaser, you remain the owner of that data —
          we process it only to send the review follow-ups you configure, and your customers can opt
          out of texts at any time by replying STOP.
        </p>

        <h2 style={{ fontSize: 16, marginTop: 22 }}>Retention &amp; deletion</h2>
        <p style={{ marginTop: 8 }}>
          Your data stays until you delete it or ask us to. To delete your account and everything in
          it, email <a href="mailto:alerts@serviche.com" style={{ color: "var(--brand)", fontWeight: 600 }}>alerts@serviche.com</a> or
          text <a href="sms:+19179940722" style={{ color: "var(--brand)", fontWeight: 600 }}>917-994-0722</a> — we&apos;ll confirm
          removal within 7 days.
        </p>

        <h2 style={{ fontSize: 16, marginTop: 22 }}>Changes</h2>
        <p style={{ marginTop: 8 }}>
          If this policy changes materially, we&apos;ll note the new date at the top of this page and
          flag it in the app.
        </p>
      </div>

      <footer>Sergio — AI back office for cleaning companies.</footer>
    </div>
  );
}
