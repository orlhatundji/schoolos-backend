/*
  Warnings:

  - You are about to drop the column `academicSessionId` on the `student_attendances` table. All the data in the column will be lost.
  - You are about to drop the column `classArmId` on the `student_attendances` table. All the data in the column will be lost.
  - You are about to drop the column `studentId` on the `student_attendances` table. All the data in the column will be lost.
  - You are about to drop the column `classArmId` on the `students` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[classArmStudentId,date]` on the table `student_attendances` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[class_arm_student_id,date]` on the table `student_attendances` will be added. If there are existing duplicate values, this will fail.
  - Made the column `classArmStudentId` on table `student_attendances` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "student_attendances" DROP CONSTRAINT "student_attendances_academicSessionId_fkey";

-- DropForeignKey
ALTER TABLE "student_attendances" DROP CONSTRAINT "student_attendances_classArmId_fkey";

-- DropForeignKey
ALTER TABLE "student_attendances" DROP CONSTRAINT "student_attendances_studentId_fkey";

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_classArmId_fkey";

-- DropIndex
DROP INDEX "student_attendances_studentId_date_key";

-- AlterTable
ALTER TABLE "student_attendances" DROP COLUMN "academicSessionId",
DROP COLUMN "classArmId",
DROP COLUMN "studentId",
ADD COLUMN     "class_arm_student_id" UUID,
ALTER COLUMN "classArmStudentId" SET NOT NULL;

-- AlterTable
ALTER TABLE "students" DROP COLUMN "classArmId";

-- CreateIndex
CREATE UNIQUE INDEX "student_attendances_classArmStudentId_date_key" ON "student_attendances"("classArmStudentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "student_attendances_class_arm_student_id_date_key" ON "student_attendances"("class_arm_student_id", "date");
