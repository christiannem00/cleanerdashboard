// Follow-up schedule — ported from the reviewchaser app so the admin SMS-queue
// tab advances reminders identically. Sequence starts at the 24 hr reminder,
// anchored to job completion.

export const REMINDERS = [
  { label: "24 hr reminder", hours: 24 },
  { label: "3 day reminder", hours: 72 },
  { label: "5 day reminder", hours: 120 },
  { label: "7 day reminder", hours: 168 },
  { label: "14 day reminder", hours: 336 },
];

export const MAX_SENDS = REMINDERS.length;

// Next due time after `sentCount` sends (1 = 24hr reminder done). Anchored to
// completedAt; skips slots already past, but always leaves >=20h after the send
// that just happened. Returns ISO string or null when exhausted.
export function nextSendAt(
  completedAtIso: string,
  sentCount: number,
  nowMs: number = Date.now()
): string | null {
  if (sentCount >= MAX_SENDS) return null;
  const completed = new Date(completedAtIso).getTime();
  if (Number.isNaN(completed)) return null;
  const floor = nowMs + 20 * 3600_000;
  for (let i = sentCount; i < REMINDERS.length; i++) {
    const at = completed + REMINDERS[i].hours * 3600_000;
    if (at >= floor) return new Date(at).toISOString();
  }
  return null;
}

export function stepLabel(step: number): string {
  const r = REMINDERS[step];
  return r ? r.label : "done";
}
