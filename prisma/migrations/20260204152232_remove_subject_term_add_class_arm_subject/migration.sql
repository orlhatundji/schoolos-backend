/*
  Warnings:

  - You are about to drop the column `classArmId` on the `class_arm_subject_teachers` table. All the data in the column will be lost.
  - You are about to drop the column `subjectId` on the `class_arm_subject_teachers` table. All the data in the column will be lost.
  - You are about to drop the `curriculum_item_ratings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `curriculum_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `curriculums` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subject_term_student_assessments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subject_term_students` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subject_terms` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[classArmSubjectId,teacherId]` on the table `class_arm_subject_teachers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `classArmSubjectId` to the `class_arm_subject_teachers` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "class_arm_subject_teachers" DROP CONSTRAINT "class_arm_subject_teachers_classArmId_fkey";

-- DropForeignKey
ALTER TABLE "class_arm_subject_teachers" DROP CONSTRAINT "class_arm_subject_teachers_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "curriculum_item_ratings" DROP CONSTRAINT "curriculum_item_ratings_curriculumItemId_fkey";

-- DropForeignKey
ALTER TABLE "curriculum_item_ratings" DROP CONSTRAINT "curriculum_item_ratings_studentId_fkey";

-- DropForeignKey
ALTER TABLE "curriculum_items" DROP CONSTRAINT "curriculum_items_curriculumId_fkey";

-- DropForeignKey
ALTER TABLE "subject_term_student_assessments" DROP CONSTRAINT "subject_term_student_assessments_subjectTermStudentId_fkey";

-- DropForeignKey
ALTER TABLE "subject_term_students" DROP CONSTRAINT "subject_term_students_studentId_fkey";

-- DropForeignKey
ALTER TABLE "subject_term_students" DROP CONSTRAINT "subject_term_students_subjectTermId_fkey";

-- DropForeignKey
ALTER TABLE "subject_terms" DROP CONSTRAINT "subject_terms_academicSessionId_fkey";

-- DropForeignKey
ALTER TABLE "subject_terms" DROP CONSTRAINT "subject_terms_curriculumId_fkey";

-- DropForeignKey
ALTER TABLE "subject_terms" DROP CONSTRAINT "subject_terms_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "subject_terms" DROP CONSTRAINT "subject_terms_termId_fkey";

-- AlterTable
ALTER TABLE "class_arm_subject_teachers" DROP COLUMN "classArmId",
DROP COLUMN "subjectId",
ADD COLUMN     "classArmSubjectId" TEXT NOT NULL;

-- DropTable
DROP TABLE "curriculum_item_ratings";

-- DropTable
DROP TABLE "curriculum_items";

-- DropTable
DROP TABLE "curriculums";

-- DropTable
DROP TABLE "subject_term_student_assessments";

-- DropTable
DROP TABLE "subject_term_students";

-- DropTable
DROP TABLE "subject_terms";

-- CreateTable
CREATE TABLE "class_arm_subjects" (
    "id" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "class_arm_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_arm_student_assessments" (
    "id" TEXT NOT NULL,
    "classArmSubjectId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "isExam" BOOLEAN NOT NULL DEFAULT false,
    "assessmentTypeId" TEXT,
    "maxScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "class_arm_student_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "class_arm_subjects_classArmId_subjectId_key" ON "class_arm_subjects"("classArmId", "subjectId");

-- CreateIndex
CREATE INDEX "class_arm_student_assessments_studentId_idx" ON "class_arm_student_assessments"("studentId");

-- CreateIndex
CREATE INDEX "class_arm_student_assessments_classArmSubjectId_idx" ON "class_arm_student_assessments"("classArmSubjectId");

-- CreateIndex
CREATE INDEX "class_arm_student_assessments_termId_idx" ON "class_arm_student_assessments"("termId");

-- CreateIndex
CREATE UNIQUE INDEX "class_arm_student_assessments_classArmSubjectId_studentId_t_key" ON "class_arm_student_assessments"("classArmSubjectId", "studentId", "termId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "class_arm_subject_teachers_classArmSubjectId_teacherId_key" ON "class_arm_subject_teachers"("classArmSubjectId", "teacherId");

-- AddForeignKey
ALTER TABLE "class_arm_subjects" ADD CONSTRAINT "class_arm_subjects_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "class_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arm_subjects" ADD CONSTRAINT "class_arm_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arm_student_assessments" ADD CONSTRAINT "class_arm_student_assessments_classArmSubjectId_fkey" FOREIGN KEY ("classArmSubjectId") REFERENCES "class_arm_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arm_student_assessments" ADD CONSTRAINT "class_arm_student_assessments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arm_student_assessments" ADD CONSTRAINT "class_arm_student_assessments_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arm_subject_teachers" ADD CONSTRAINT "class_arm_subject_teachers_classArmSubjectId_fkey" FOREIGN KEY ("classArmSubjectId") REFERENCES "class_arm_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
