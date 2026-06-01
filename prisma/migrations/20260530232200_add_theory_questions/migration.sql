-- Add theory questions and manual grading support.
ALTER TYPE "QuestionType" ADD VALUE 'THEORY';
ALTER TYPE "QuizAttemptStatus" ADD VALUE 'PENDING_MANUAL_GRADE';

ALTER TABLE "question_responses"
  ADD COLUMN "pendingGrade" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "manualGradedByUserId" TEXT,
  ADD COLUMN "manualGradedAt" TIMESTAMP(3),
  ADD COLUMN "teacherFeedback" TEXT;

ALTER TABLE "question_responses"
  ADD CONSTRAINT "question_responses_manualGradedByUserId_fkey"
  FOREIGN KEY ("manualGradedByUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "question_responses_pendingGrade_idx" ON "question_responses"("pendingGrade");
CREATE INDEX "question_responses_manualGradedByUserId_idx" ON "question_responses"("manualGradedByUserId");
