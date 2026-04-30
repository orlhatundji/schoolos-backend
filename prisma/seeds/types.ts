/**
 * Shared shape returned by every individual seed script. Used by the
 * platform seed-runner BFF endpoint so the UI can show how many rows were
 * touched, how long the run took, and whether anything was skipped because
 * of missing prerequisites.
 */
export interface SeedRunResult {
  upserted: number;
  skipped: number;
  durationMs: number;
  notes?: string;
}

/**
 * Stable identifier for a seed script. Used as a URL slug on the platform
 * seed-runner endpoint and as the audit row's `seedSlug` value.
 */
export type SeedSlug =
  | 'canonical-subjects'
  | 'canonical-levels'
  | 'canonical-terms'
  | 'popular-exams'
  | 'equation-library'
  | 'symbol-library'
  | 'curated-questions'
  | 'curated-quizzes';
