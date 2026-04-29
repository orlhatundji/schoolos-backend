/**
 * Quiz/Assessments billing constants and waiver logic.
 *
 * Usage is metered per QuizAttempt at start. The nominal amount is computed
 * from a duration tier × question-count tier × unit rate. Every metered event
 * also resolves a waiver: while the global Beta period is active OR the school
 * is within its first FREE_TRIAL_DAYS days, the event is recorded with
 * `isWaived = true` and billing systems must skip it.
 *
 * MIRROR: keep `UNIT_RATE_NAIRA` and the duration/question tier values in sync
 * with the frontend mirror at:
 *   schoolos-frontend/apps/admin-portal/app/(root)/assessments/pricing.ts
 * The frontend constants are a fallback; the API also returns `unitRateNaira`
 * via /bff/admin/assessments-settings so the page renders the live value.
 */

export const UNIT_RATE_NAIRA = 50;
export const FREE_TRIAL_DAYS = 365;

export const BETA_UNTIL = new Date(
  process.env.ASSESSMENTS_BETA_UNTIL ?? '2026-12-31T23:59:59Z',
);

export type WaiverReason = 'BETA' | 'FIRST_YEAR';

export function durationTier(durationMinutes: number): number {
  if (durationMinutes <= 30) return 1.0;
  if (durationMinutes <= 60) return 1.5;
  return 2.0;
}

export function questionTier(questionCount: number): number {
  if (questionCount <= 10) return 1.0;
  if (questionCount <= 25) return 1.25;
  return 1.5;
}

export function computeChargeableUnits(durationMinutes: number, questionCount: number): number {
  return durationTier(durationMinutes) * questionTier(questionCount);
}

export function resolveWaiver(
  schoolCreatedAt: Date,
  now: Date = new Date(),
): { isWaived: boolean; reason: WaiverReason | null } {
  if (now < BETA_UNTIL) return { isWaived: true, reason: 'BETA' };
  const trialEnd = new Date(schoolCreatedAt.getTime() + FREE_TRIAL_DAYS * 86_400_000);
  if (now < trialEnd) return { isWaived: true, reason: 'FIRST_YEAR' };
  return { isWaived: false, reason: null };
}

export function freeUntil(schoolCreatedAt: Date): {
  date: Date;
  reason: WaiverReason | null;
} {
  const trialEnd = new Date(schoolCreatedAt.getTime() + FREE_TRIAL_DAYS * 86_400_000);
  if (BETA_UNTIL >= trialEnd) {
    return { date: BETA_UNTIL, reason: new Date() < BETA_UNTIL ? 'BETA' : null };
  }
  return { date: trialEnd, reason: new Date() < trialEnd ? 'FIRST_YEAR' : null };
}
