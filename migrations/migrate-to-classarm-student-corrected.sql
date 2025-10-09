-- Migration script to transform existing data to use ClassArmStudent entity
-- This script should be run after the schema migration

-- Step 1: Create ClassArmStudent records for all existing students
INSERT INTO class_arm_students (
    id,
    "studentId",
    "classArmId",
    "academicSessionId",
    "isActive",
    "enrolledAt",
    "createdAt",
    "updatedAt"
)
SELECT 
    gen_random_uuid()::text as id,
    s.id as "studentId",
    s."classArmId",
    ca."academicSessionId",
    true as "isActive",
    s."createdAt" as "enrolledAt",
    s."createdAt",
    s."updatedAt"
FROM students s
JOIN class_arms ca ON s."classArmId" = ca.id
WHERE s."deletedAt" IS NULL;

-- Step 2: Update StudentAttendance records to reference ClassArmStudent
-- Update the new column with the correct ClassArmStudent ID
UPDATE student_attendances sa
SET "classArmStudentId" = cas.id
FROM class_arm_students cas
WHERE sa."studentId" = cas."studentId" 
  AND sa."classArmId" = cas."classArmId"
  AND sa."academicSessionId" = cas."academicSessionId";

-- Make the new column NOT NULL after populating it
ALTER TABLE student_attendances ALTER COLUMN "classArmStudentId" SET NOT NULL;
