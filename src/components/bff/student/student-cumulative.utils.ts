/**
 * Map of termId → (subjectId → totalScore) for terms preceding the report-card term.
 * A subject id absent from the inner map means the student did not attempt that
 * subject in that term — distinct from "attempted with score 0".
 */
export type PriorBySubjectByTerm = Map<string, Map<string, number>>;

export interface CumulativeFigures {
  cumulativeTotal: number;
  cumulativeAverage: number;
  /** Number of terms in which this subject was attempted, including the current term. */
  termsAttempted: number;
}

/**
 * Compute cumulative total / average for a single subject across the current term
 * plus any prior terms in which the subject was actually attempted. A subject
 * newly picked up in Term 2 should not have its cumulative average halved by a
 * phantom Term 1 score of 0 — so the divisor only counts terms with scores.
 */
export function computeSubjectCumulative(
  subjectId: string,
  currentTermTotal: number,
  priorTermIds: readonly string[],
  priorBySubjectByTerm: PriorBySubjectByTerm,
): CumulativeFigures {
  let priorTotalForSubject = 0;
  let priorTermsAttempted = 0;
  for (const termId of priorTermIds) {
    const score = priorBySubjectByTerm.get(termId)?.get(subjectId);
    if (score !== undefined) {
      priorTotalForSubject += score;
      priorTermsAttempted += 1;
    }
  }
  const termsAttempted = priorTermsAttempted + 1; // +1 for current term (caller invokes only for attempted subjects)
  const cumulativeTotal = priorTotalForSubject + currentTermTotal;
  const cumulativeAverage = Math.round((cumulativeTotal / termsAttempted) * 100) / 100;
  return { cumulativeTotal, cumulativeAverage, termsAttempted };
}
