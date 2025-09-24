-- First, add the academicSessionId column to the assessment_structures table
ALTER TABLE "assessment_structures" ADD COLUMN "academicSessionId" TEXT;

-- Update existing records to use the current academic session for the school
-- This assumes each school has at least one academic session
UPDATE "assessment_structures" 
SET "academicSessionId" = (
  SELECT "id" 
  FROM "academic_sessions" 
  WHERE "academic_sessions"."schoolId" = "assessment_structures"."schoolId" 
  AND "academic_sessions"."isCurrent" = true 
  LIMIT 1
)
WHERE "academicSessionId" IS NULL;

-- If there are still NULL values (schools without current sessions), use the most recent session
UPDATE "assessment_structures" 
SET "academicSessionId" = (
  SELECT "id" 
  FROM "academic_sessions" 
  WHERE "academic_sessions"."schoolId" = "assessment_structures"."schoolId" 
  ORDER BY "academic_sessions"."createdAt" DESC 
  LIMIT 1
)
WHERE "academicSessionId" IS NULL;

-- Now make the column NOT NULL
ALTER TABLE "assessment_structures" ALTER COLUMN "academicSessionId" SET NOT NULL;

-- Add the foreign key constraint (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'assessment_structures_academicSessionId_fkey'
    ) THEN
        ALTER TABLE "assessment_structures" ADD CONSTRAINT "assessment_structures_academicSessionId_fkey" 
        FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Drop the old unique constraint
ALTER TABLE "assessment_structures" DROP CONSTRAINT IF EXISTS "assessment_structures_schoolId_name_key";

-- Add the new unique constraint that includes academicSessionId (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'assessment_structures_schoolId_academicSessionId_name_key'
    ) THEN
        ALTER TABLE "assessment_structures" ADD CONSTRAINT "assessment_structures_schoolId_academicSessionId_name_key" 
        UNIQUE ("schoolId", "academicSessionId", "name");
    END IF;
END $$;

-- Create index for better performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS "assessment_structures_academicSessionId_idx" ON "assessment_structures"("academicSessionId");
