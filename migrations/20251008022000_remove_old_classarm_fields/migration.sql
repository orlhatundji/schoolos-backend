-- Remove old fields that are no longer needed after ClassArmStudent migration

-- Remove old columns from student_attendances table
ALTER TABLE "student_attendances" DROP COLUMN "studentId";
ALTER TABLE "student_attendances" DROP COLUMN "classArmId";
ALTER TABLE "student_attendances" DROP COLUMN "academicSessionId";

-- Remove old column from students table
ALTER TABLE "students" DROP COLUMN "classArmId";

-- Update unique constraint on student_attendances
DROP INDEX IF EXISTS "student_attendances_studentId_date_key";
CREATE UNIQUE INDEX "student_attendances_classArmStudentId_date_key" ON "student_attendances" ("classArmStudentId", "date");
