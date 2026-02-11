/*
  Warnings:

  - You are about to drop the column `medicalConditions` on the `students` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "students" DROP COLUMN "medicalConditions",
ADD COLUMN     "medicalInformation" JSONB;
