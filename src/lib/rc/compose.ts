// The review-ask SMS copy — ported from reviewchaser. Reply-based flow: the
// customer answers 1 (went great) or 2 (could've been better).

export type RcRequest = {
  to_name?: string | null;
  step: number;
  [k: string]: any;
};

export function composeSms(r: RcRequest, business: string): string {
  const first = r.to_name ? r.to_name.split(" ")[0] : null;
  const hi = first ? `Hi ${first}!` : "Hi!";
  if (r.step === 0) {
    return `${hi} It's ${business} — quick one: how did your last cleaning go? Reply 1 if it went great, or 2 if it could've been better.`;
  }
  return `${hi.replace("!", ",")} ${business} again — how was the last clean? Reply 1 = went great, 2 = could've been better.`;
}
