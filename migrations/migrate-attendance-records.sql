-- Handle attendance records that don't match current student class arm assignments
-- These are likely historical records from when students were in different class arms

-- First, let's create ClassArmStudent records for the class arms mentioned in attendance records
-- that don't have corresponding student assignments
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
SELECT DISTINCT
    gen_random_uuid()::text as id,
    sa."studentId",
    sa."classArmId",
    sa."academicSessionId", 
    false as "isActive", -- These are historical records
    sa."createdAt" as "enrolledAt",
    sa."createdAt",
    sa."updatedAt"
FROM student_attendances sa
WHERE sa."classArmStudentId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM class_arm_students cas 
    WHERE cas."studentId" = sa."studentId" 
      AND cas."classArmId" = sa."classArmId"
      AND cas."academicSessionId" = sa."academicSessionId"
  );

-- Now update the attendance records to reference these new ClassArmStudent records
UPDATE student_attendances sa
SET "classArmStudentId" = cas.id
FROM class_arm_students cas
WHERE sa."studentId" = cas."studentId" 
  AND sa."classArmId" = cas."classArmId"
  AND sa."academicSessionId" = cas."academicSessionId"
  AND sa."classArmStudentId" IS NULL;

-- Check if there are still any unmatched records
SELECT COUNT(*) as unmatched_records FROM student_attendances WHERE "classArmStudentId" IS NULL;
