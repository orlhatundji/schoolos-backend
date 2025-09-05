-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'GRADUATED', 'TRANSFERRED');

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "student_status_history" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "previousStatus" "StudentStatus" NOT NULL,
    "newStatus" "StudentStatus" NOT NULL,
    "reason" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_status_history_studentId_idx" ON "student_status_history"("studentId");

-- CreateIndex
CREATE INDEX "student_status_history_changedAt_idx" ON "student_status_history"("changedAt");

-- AddForeignKey
ALTER TABLE "student_status_history" ADD CONSTRAINT "student_status_history_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
