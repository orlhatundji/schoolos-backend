-- AlterTable
ALTER TABLE "level_progressions" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "promotion_batches" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "student_promotions" ADD COLUMN     "promotedStudentId" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "student_promotions_promotedStudentId_idx" ON "student_promotions"("promotedStudentId");

-- AddForeignKey
ALTER TABLE "student_promotions" ADD CONSTRAINT "student_promotions_promotedStudentId_fkey" FOREIGN KEY ("promotedStudentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
