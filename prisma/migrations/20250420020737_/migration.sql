/*
  Warnings:

  - You are about to drop the column `schoolId` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `schoolId` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `schoolId` on the `Teacher` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Admin" DROP CONSTRAINT "Admin_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Teacher" DROP CONSTRAINT "Teacher_schoolId_fkey";

-- AlterTable
ALTER TABLE "Admin" DROP COLUMN "schoolId";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "schoolId";

-- AlterTable
ALTER TABLE "Teacher" DROP COLUMN "schoolId";
