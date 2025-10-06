/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `class_arms` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `class_arms` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "class_arms" ADD COLUMN     "slug" TEXT;

-- Generate slugs for existing records
UPDATE "class_arms" 
SET "slug" = LOWER(
  CONCAT(
    (SELECT l.name FROM levels l WHERE l.id = "class_arms"."levelId"),
    '-',
    "name",
    '-',
    (SELECT as_session."academicYear" FROM academic_sessions as_session WHERE as_session.id = "class_arms"."academicSessionId")
  )
)
WHERE "slug" IS NULL;

-- Make slug NOT NULL after populating existing records
ALTER TABLE "class_arms" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "class_arms_slug_key" ON "class_arms"("slug");
