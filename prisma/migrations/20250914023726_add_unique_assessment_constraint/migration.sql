/*
  Warnings:

  - A unique constraint covering the columns `[subjectTermStudentId,name,deletedAt]` on the table `subject_term_student_assessments` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "subject_term_student_assessments_subjectTermStudentId_name__key" ON "subject_term_student_assessments"("subjectTermStudentId", "name", "deletedAt");
