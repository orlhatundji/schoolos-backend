/*
  Warnings:

  - You are about to drop the column `name` on the `AcademicSession` table. All the data in the column will be lost.
  - Added the required column `academicYear` to the `AcademicSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endDate` to the `AcademicSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `AcademicSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AcademicSession" DROP COLUMN "name",
ADD COLUMN     "academicYear" TEXT NOT NULL,
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "isCurrent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;
