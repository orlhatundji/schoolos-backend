/*
  Warnings:

  - Added the required column `academicSessionId` to the `AssessmentStructure` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AssessmentStructure" ADD COLUMN     "academicSessionId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "AssessmentStructure_academicSessionId_idx" ON "AssessmentStructure"("academicSessionId");

-- AddForeignKey
ALTER TABLE "AssessmentStructure" ADD CONSTRAINT "AssessmentStructure_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
