-- Add academicSessionId column to assessment_structures table
-- First, add the column as nullable
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

-- Add the foreign key constraint
ALTER TABLE "assessment_structures" ADD CONSTRAINT "assessment_structures_academicSessionId_fkey" 
FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop the old unique constraint
ALTER TABLE "assessment_structures" DROP CONSTRAINT IF EXISTS "assessment_structures_schoolId_name_key";

-- Add the new unique constraint that includes academicSessionId
ALTER TABLE "assessment_structures" ADD CONSTRAINT "assessment_structures_schoolId_academicSessionId_name_key" 
UNIQUE ("schoolId", "academicSessionId", "name");

-- Create index for better performance
CREATE INDEX "assessment_structures_academicSessionId_idx" ON "assessment_structures"("academicSessionId");
