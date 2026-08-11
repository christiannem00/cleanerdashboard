// Human-readable labels for the onboarding enum values, kept in one place so
// the admin dashboard renders "Quo / OpenPhone" instead of "quo_openphone".
// Mirrors the option lists in components/OnboardingForm.tsx.

const PHONE_LABELS: Record<string, string> = {
  quo_openphone: "Quo / OpenPhone",
  ghl_lcphone: "GoHighLevel / LC Phone",
  twilio: "Twilio",
  other: "Other",
};

const BOOKING_LABELS: Record<string, string> = {
  bookingkoala: "BookingKoala",
  zenmaid: "ZenMaid",
  other: "Other",
};

export function phoneServiceLabel(
  value?: string | null,
  other?: string | null
): string {
  if (!value) return "—";
  if (value === "other") return other?.trim() ? `Other — ${other.trim()}` : "Other";
  return PHONE_LABELS[value] || value;
}

export function bookingSoftwareLabel(
  value?: string | null,
  other?: string | null
): string {
  if (!value) return "—";
  if (value === "other") return other?.trim() ? `Other — ${other.trim()}` : "Other";
  return BOOKING_LABELS[value] || value;
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtDay(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// "3 days ago" style relative time for the activity feed.
export function fmtAgo(iso?: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}
