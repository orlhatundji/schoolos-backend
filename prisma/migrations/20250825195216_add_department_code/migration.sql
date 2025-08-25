/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `departments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "code" TEXT;

-- Update existing departments with default codes based on their names
UPDATE "departments" SET "code" = 'SCI' WHERE "name" ILIKE '%science%';
UPDATE "departments" SET "code" = 'MAT' WHERE "name" ILIKE '%math%' OR "name" ILIKE '%mathematics%';
UPDATE "departments" SET "code" = 'ENG' WHERE "name" ILIKE '%english%';
UPDATE "departments" SET "code" = 'ART' WHERE "name" ILIKE '%art%';
UPDATE "departments" SET "code" = 'COM' WHERE "name" ILIKE '%commercial%';
UPDATE "departments" SET "code" = 'SOC' WHERE "name" ILIKE '%social%';
UPDATE "departments" SET "code" = 'GEN' WHERE "code" IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE "departments" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");
