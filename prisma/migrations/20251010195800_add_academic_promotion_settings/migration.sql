/*
  Warnings:

  - You are about to drop the `promotion_batches` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "promotion_batches" DROP CONSTRAINT "promotion_batches_fromAcademicSessionId_fkey";

-- DropForeignKey
ALTER TABLE "promotion_batches" DROP CONSTRAINT "promotion_batches_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "promotion_batches" DROP CONSTRAINT "promotion_batches_toAcademicSessionId_fkey";

-- DropTable
DROP TABLE "promotion_batches";

-- CreateTable
CREATE TABLE "academic_promotion_settings" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "coreSubjects" TEXT[],
    "totalSubjectsPassed" INTEGER NOT NULL,
    "totalAverage" INTEGER NOT NULL,
    "useAttendance" BOOLEAN NOT NULL DEFAULT true,
    "minimumAttendanceRate" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_promotion_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academic_promotion_settings_schoolId_key" ON "academic_promotion_settings"("schoolId");

-- AddForeignKey
ALTER TABLE "academic_promotion_settings" ADD CONSTRAINT "academic_promotion_settings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
