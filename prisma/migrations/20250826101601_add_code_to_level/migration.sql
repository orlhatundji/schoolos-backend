/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `levels` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `levels` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "levels" ADD COLUMN     "code" TEXT;

-- Update existing levels with default codes based on their names
UPDATE "levels" SET "code" = 'JSS1' WHERE "name" = 'JSS1';
UPDATE "levels" SET "code" = 'JSS2' WHERE "name" = 'JSS2';
UPDATE "levels" SET "code" = 'JSS3' WHERE "name" = 'JSS3';
UPDATE "levels" SET "code" = 'SS1' WHERE "name" = 'SS1';
UPDATE "levels" SET "code" = 'SS2' WHERE "name" = 'SS2';
UPDATE "levels" SET "code" = 'SS3' WHERE "name" = 'SS3';

-- Make the column NOT NULL after setting default values
ALTER TABLE "levels" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "levels_code_key" ON "levels"("code");
