export const QUIZ_ATTEMPTS_QUEUE = 'quiz-attempts-queue';

export enum QuizAttemptsJob {
  GRADE_ATTEMPT = 'GRADE_ATTEMPT',
  AUTO_SUBMIT_TICK = 'AUTO_SUBMIT_TICK',
}

export interface GradeAttemptJobData {
  attemptId: string;
}

export interface AutoSubmitTickJobData {
  // empty — the worker scans for due attempts
  scheduledAt?: string;
}

export const AUTO_SUBMIT_TICK_INTERVAL_MS = 60_000;
export const AUTO_SUBMIT_TICK_JOB_ID = 'auto-submit-tick-singleton';
