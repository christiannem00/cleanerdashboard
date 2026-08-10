"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PHONE_OPTIONS = [
  { value: "quo_openphone", label: "Quo / OpenPhone" },
  { value: "ghl_lcphone", label: "GoHighLevel / LC Phone" },
  { value: "twilio", label: "Twilio" },
  { value: "other", label: "Other" },
];

const BOOKING_OPTIONS = [
  { value: "bookingkoala", label: "BookingKoala" },
  { value: "zenmaid", label: "ZenMaid" },
  { value: "other", label: "Other" },
];

export default function OnboardingForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [phoneService, setPhoneService] = useState("");
  const [phoneOther, setPhoneOther] = useState("");
  const [bookingSoftware, setBookingSoftware] = useState("");
  const [bookingOther, setBookingOther] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const phoneOtherNeeded = phoneService === "other";
  const bookingOtherNeeded = bookingSoftware === "other";
  const ready =
    phoneService &&
    bookingSoftware &&
    (!phoneOtherNeeded || phoneOther.trim()) &&
    (!bookingOtherNeeded || bookingOther.trim());

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { error: dbError } = await supabase.from("business_profiles").upsert({
      user_id: userId,
      phone_service: phoneService,
      phone_service_other: phoneOtherNeeded ? phoneOther.trim() : null,
      booking_software: bookingSoftware,
      booking_software_other: bookingOtherNeeded ? bookingOther.trim() : null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (dbError) {
      setError("Could not save — try again.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="center">
      <div className="card">
        <div className="brand" style={{ marginBottom: 16 }}>
          <div className="logo">S</div>
          <div>
            <h1 style={{ fontSize: 20 }}>Welcome to Sergio</h1>
            <p className="sub" style={{ margin: 0 }}>Two quick questions and you&apos;re in</p>
          </div>
        </div>
        <form onSubmit={save}>
          <label className="field">
            <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>
              What&apos;s your phone service?
            </span>
            <select
              className="selectfield"
              value={phoneService}
              onChange={(e) => setPhoneService(e.target.value)}
              required
            >
              <option value="" disabled>Select your phone service…</option>
              {PHONE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          {phoneOtherNeeded && (
            <label className="field">
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>
                Which phone service do you use?
              </span>
              <input
                value={phoneOther}
                onChange={(e) => setPhoneOther(e.target.value)}
                placeholder="e.g. RingCentral"
                required
              />
            </label>
          )}

          <label className="field">
            <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>
              What&apos;s your booking software?
            </span>
            <select
              className="selectfield"
              value={bookingSoftware}
              onChange={(e) => setBookingSoftware(e.target.value)}
              required
            >
              <option value="" disabled>Select your booking software…</option>
              {BOOKING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          {bookingOtherNeeded && (
            <label className="field">
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5 }}>
                Which booking software do you use?
              </span>
              <input
                value={bookingOther}
                onChange={(e) => setBookingOther(e.target.value)}
                placeholder="e.g. Jobber"
                required
              />
            </label>
          )}

          <button className="btn dark" style={{ width: "100%", marginTop: 14 }} disabled={saving || !ready}>
            {saving ? "Saving…" : "Continue →"}
          </button>
          {error && <div className="msg err">{error}</div>}
        </form>
      </div>
    </div>
  );
}
