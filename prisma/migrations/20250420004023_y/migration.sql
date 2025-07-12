/*
  Warnings:

  - Made the column `classArmId` on table `Student` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_classArmId_fkey";

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "classArmId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
