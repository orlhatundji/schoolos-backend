-- Assessment System Refactor Migration
-- 1. Add new columns to SubjectTermStudentAssessment
-- 2. Drop old unique constraint
-- 3. Add partial unique index for active records
-- 4. Drop AssessmentStructure and Assessment tables

-- DropForeignKey
ALTER TABLE "assessment_structures" DROP CONSTRAINT "assessment_structures_academicSessionId_fkey";
ALTER TABLE "assessment_structures" DROP CONSTRAINT "assessment_structures_schoolId_fkey";
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_schoolId_fkey";

-- DropIndex (old broken unique constraint)
DROP INDEX IF EXISTS "subject_term_student_assessments_subjectTermStudentId_name__key";
DROP INDEX IF EXISTS "unique_assessment_per_student_term";

-- AlterTable: Add new columns (nullable for backward compat)
ALTER TABLE "subject_term_student_assessments" ADD COLUMN "assessmentTypeId" TEXT;
ALTER TABLE "subject_term_student_assessments" ADD COLUMN "maxScore" INTEGER;

-- Create partial unique index: only one active (non-deleted) assessment per student+type
CREATE UNIQUE INDEX "unique_active_assessment_per_student"
ON "subject_term_student_assessments" ("subjectTermStudentId", "assessmentTypeId")
WHERE "deletedAt" IS NULL;

-- DropTable
DROP TABLE "assessment_structures";
DROP TABLE "assessments";
