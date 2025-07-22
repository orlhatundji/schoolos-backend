/*
  Warnings:

  - You are about to drop the column `date` on the `AcademicSessionCalendarItem` table. All the data in the column will be lost.
  - You are about to drop the column `curriculumProgress` on the `ClassArm` table. All the data in the column will be lost.
  - You are about to drop the column `subjectId` on the `Curriculum` table. All the data in the column will be lost.
  - You are about to drop the column `academicSessionId` on the `SubjectTermStudent` table. All the data in the column will be lost.
  - You are about to drop the column `subjectId` on the `SubjectTermStudent` table. All the data in the column will be lost.
  - You are about to drop the column `termId` on the `SubjectTermStudent` table. All the data in the column will be lost.
  - You are about to drop the `AssessmentComponent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AssessmentStructure` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[subjectTermId]` on the table `Curriculum` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `startDate` to the `AcademicSessionCalendarItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `academicSessionId` to the `ClassArm` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `ClassArm` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subjectTermId` to the `SubjectTermStudent` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AssessmentComponent" DROP CONSTRAINT "AssessmentComponent_assessmentStructureId_fkey";

-- DropForeignKey
ALTER TABLE "AssessmentStructure" DROP CONSTRAINT "AssessmentStructure_academicSessionId_fkey";

-- DropForeignKey
ALTER TABLE "AssessmentStructure" DROP CONSTRAINT "AssessmentStructure_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Curriculum" DROP CONSTRAINT "Curriculum_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "SubjectTermStudent" DROP CONSTRAINT "SubjectTermStudent_academicSessionId_fkey";

-- DropForeignKey
ALTER TABLE "SubjectTermStudent" DROP CONSTRAINT "SubjectTermStudent_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "SubjectTermStudent" DROP CONSTRAINT "SubjectTermStudent_termId_fkey";

-- AlterTable
ALTER TABLE "AcademicSessionCalendarItem" DROP COLUMN "date",
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ClassArm" DROP COLUMN "curriculumProgress",
ADD COLUMN     "academicSessionId" TEXT NOT NULL,
ADD COLUMN     "schoolId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Curriculum" DROP COLUMN "subjectId",
ADD COLUMN     "subjectTermId" TEXT;

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "hodId" TEXT;

-- AlterTable
ALTER TABLE "Hod" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SubjectTermStudent" DROP COLUMN "academicSessionId",
DROP COLUMN "subjectId",
DROP COLUMN "termId",
ADD COLUMN     "subjectTermId" TEXT NOT NULL;

-- DropTable
DROP TABLE "AssessmentComponent";

-- DropTable
DROP TABLE "AssessmentStructure";

-- CreateTable
CREATE TABLE "SubjectTerm" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "academicSessionId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "curriculumId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SubjectTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubjectTerm_curriculumId_key" ON "SubjectTerm"("curriculumId");

-- CreateIndex
CREATE UNIQUE INDEX "Curriculum_subjectTermId_key" ON "Curriculum"("subjectTermId");

-- AddForeignKey
ALTER TABLE "ClassArm" ADD CONSTRAINT "ClassArm_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassArm" ADD CONSTRAINT "ClassArm_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectTerm" ADD CONSTRAINT "SubjectTerm_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectTerm" ADD CONSTRAINT "SubjectTerm_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectTerm" ADD CONSTRAINT "SubjectTerm_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectTerm" ADD CONSTRAINT "SubjectTerm_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "Curriculum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectTermStudent" ADD CONSTRAINT "SubjectTermStudent_subjectTermId_fkey" FOREIGN KEY ("subjectTermId") REFERENCES "SubjectTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
