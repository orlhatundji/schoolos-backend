-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "assessmentsDisabledAt" TIMESTAMP(3),
ADD COLUMN     "assessmentsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "assessmentsEnabledAt" TIMESTAMP(3),
ADD COLUMN     "assessmentsEnabledById" TEXT;

-- CreateTable
CREATE TABLE "quiz_usage_events" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "quizAttemptId" TEXT NOT NULL,
    "quizAssignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "chargeableUnits" DECIMAL(10,2) NOT NULL,
    "unitRateSnapshot" DECIMAL(10,4) NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "isWaived" BOOLEAN NOT NULL DEFAULT false,
    "waiverReason" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_usage_events_quizAttemptId_key" ON "quiz_usage_events"("quizAttemptId");

-- CreateIndex
CREATE INDEX "quiz_usage_events_schoolId_recordedAt_idx" ON "quiz_usage_events"("schoolId", "recordedAt");

-- CreateIndex
CREATE INDEX "quiz_usage_events_schoolId_isWaived_idx" ON "quiz_usage_events"("schoolId", "isWaived");

-- AddForeignKey
ALTER TABLE "quiz_usage_events" ADD CONSTRAINT "quiz_usage_events_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_usage_events" ADD CONSTRAINT "quiz_usage_events_quizAttemptId_fkey" FOREIGN KEY ("quizAttemptId") REFERENCES "quiz_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
