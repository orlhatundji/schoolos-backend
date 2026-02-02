-- Clean up duplicate subject_term_students records before adding unique constraint
-- Keep the oldest record (by createdAt) and reassign assessments from duplicates

-- Step 1: Move assessments from duplicate records to the canonical (oldest) record
WITH canonical AS (
  SELECT DISTINCT ON ("studentId", "subjectTermId") id, "studentId", "subjectTermId"
  FROM "subject_term_students"
  WHERE "deletedAt" IS NULL
  ORDER BY "studentId", "subjectTermId", "createdAt" ASC
),
duplicates AS (
  SELECT sts.id AS dup_id, c.id AS canonical_id
  FROM "subject_term_students" sts
  JOIN canonical c ON sts."studentId" = c."studentId" AND sts."subjectTermId" = c."subjectTermId"
  WHERE sts.id != c.id AND sts."deletedAt" IS NULL
)
UPDATE "subject_term_student_assessments" a
SET "subjectTermStudentId" = d.canonical_id
FROM duplicates d
WHERE a."subjectTermStudentId" = d.dup_id;

-- Step 2: Delete the duplicate subject_term_students records (assessments already moved)
WITH canonical AS (
  SELECT DISTINCT ON ("studentId", "subjectTermId") id, "studentId", "subjectTermId"
  FROM "subject_term_students"
  WHERE "deletedAt" IS NULL
  ORDER BY "studentId", "subjectTermId", "createdAt" ASC
)
DELETE FROM "subject_term_students" sts
USING canonical c
WHERE sts."studentId" = c."studentId"
  AND sts."subjectTermId" = c."subjectTermId"
  AND sts.id != c.id
  AND sts."deletedAt" IS NULL;

-- Step 3: Add unique constraint
CREATE UNIQUE INDEX "unique_student_subject_term" ON "subject_term_students"("studentId", "subjectTermId");
