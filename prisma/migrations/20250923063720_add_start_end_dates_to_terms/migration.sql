/*
  Warnings:

  - Added the required column `endDate` to the `terms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `terms` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "assessment_structures_schoolId_name_key";

-- AlterTable
ALTER TABLE "terms" ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "assessment_structure_templates" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "academicSessionId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "assessments" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isGlobalDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "assessment_structure_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessment_structure_templates_academicSessionId_idx" ON "assessment_structure_templates"("academicSessionId");

-- CreateIndex
CREATE INDEX "assessment_structure_templates_isGlobalDefault_idx" ON "assessment_structure_templates"("isGlobalDefault");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_structure_templates_schoolId_academicSessionId_i_key" ON "assessment_structure_templates"("schoolId", "academicSessionId", "isActive");

-- AddForeignKey
ALTER TABLE "assessment_structure_templates" ADD CONSTRAINT "assessment_structure_templates_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_structure_templates" ADD CONSTRAINT "assessment_structure_templates_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
