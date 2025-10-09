-- Migration script to transform existing data to use ClassArmStudent entity
-- This script should be run after the schema migration

-- Step 1: Create ClassArmStudent records for all existing students
INSERT INTO class_arm_students (
    id,
    student_id,
    class_arm_id,
    academic_session_id,
    is_active,
    enrolled_at,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid() as id,
    s.id as student_id,
    s.class_arm_id,
    ca.academic_session_id,
    true as is_active,
    s.created_at as enrolled_at,
    s.created_at,
    s.updated_at
FROM students s
JOIN class_arms ca ON s.class_arm_id = ca.id
WHERE s.deleted_at IS NULL;

-- Step 2: Update StudentAttendance records to reference ClassArmStudent
-- First, add the new column
ALTER TABLE student_attendances ADD COLUMN class_arm_student_id UUID;

-- Update the new column with the correct ClassArmStudent ID
UPDATE student_attendances sa
SET class_arm_student_id = cas.id
FROM class_arm_students cas
WHERE sa.student_id = cas.student_id 
  AND sa.class_arm_id = cas.class_arm_id
  AND sa.academic_session_id = cas.academic_session_id;

-- Make the new column NOT NULL after populating it
ALTER TABLE student_attendances ALTER COLUMN class_arm_student_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE student_attendances 
ADD CONSTRAINT fk_student_attendances_class_arm_student 
FOREIGN KEY (class_arm_student_id) REFERENCES class_arm_students(id) ON DELETE CASCADE;

-- Step 3: Remove old columns from student_attendances
ALTER TABLE student_attendances DROP COLUMN student_id;
ALTER TABLE student_attendances DROP COLUMN class_arm_id;
ALTER TABLE student_attendances DROP COLUMN academic_session_id;

-- Step 4: Remove old class_arm_id from students table
ALTER TABLE students DROP COLUMN class_arm_id;

-- Step 5: Update unique constraint on student_attendances
DROP INDEX IF EXISTS student_attendances_student_id_date_key;
CREATE UNIQUE INDEX student_attendances_class_arm_student_id_date_key 
ON student_attendances (class_arm_student_id, date);
