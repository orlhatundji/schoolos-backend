-- Step 1: Add current_term_id column to schools
ALTER TABLE "schools" ADD COLUMN "current_term_id" TEXT;

-- Step 2: Populate current_term_id from existing isCurrent flags BEFORE dropping them
UPDATE "schools" SET "current_term_id" = (
  SELECT t."id"
  FROM "terms" t
  JOIN "academic_sessions" s ON t."academicSessionId" = s."id"
  WHERE s."schoolId" = "schools"."id"
    AND t."isCurrent" = true
  LIMIT 1
);

-- Step 3: Add foreign key constraint
ALTER TABLE "schools" ADD CONSTRAINT "schools_current_term_id_fkey" FOREIGN KEY ("current_term_id") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 4: Drop isCurrent from terms
ALTER TABLE "terms" DROP COLUMN "isCurrent";

-- Step 5: Drop isCurrent from academic_sessions
ALTER TABLE "academic_sessions" DROP COLUMN "isCurrent";
