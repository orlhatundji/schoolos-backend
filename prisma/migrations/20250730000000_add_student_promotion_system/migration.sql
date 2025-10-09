-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('AUTOMATIC', 'MANUAL', 'REPEAT', 'GRADUATION', 'TRANSFER');

-- CreateTable
CREATE TABLE "student_promotions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromClassArmId" TEXT,
    "toClassArmId" TEXT NOT NULL,
    "fromLevelId" TEXT,
    "toLevelId" TEXT NOT NULL,
    "fromAcademicSessionId" TEXT,
    "toAcademicSessionId" TEXT NOT NULL,
    "promotionType" "PromotionType" NOT NULL,
    "promotionDate" TIMESTAMP(3) NOT NULL,
    "promotedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "student_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_progressions" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "fromLevelId" TEXT NOT NULL,
    "toLevelId" TEXT NOT NULL,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "level_progressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_batches" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "fromAcademicSessionId" TEXT NOT NULL,
    "toAcademicSessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "processedStudents" INTEGER NOT NULL DEFAULT 0,
    "successfulPromotions" INTEGER NOT NULL DEFAULT 0,
    "failedPromotions" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "promotion_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_promotions_studentId_idx" ON "student_promotions"("studentId");

-- CreateIndex
CREATE INDEX "student_promotions_promotionDate_idx" ON "student_promotions"("promotionDate");

-- CreateIndex
CREATE INDEX "level_progressions_schoolId_idx" ON "level_progressions"("schoolId");

-- CreateIndex
CREATE INDEX "promotion_batches_schoolId_idx" ON "promotion_batches"("schoolId");

-- AddForeignKey
ALTER TABLE "student_promotions" ADD CONSTRAINT "student_promotions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_promotions" ADD CONSTRAINT "student_promotions_fromClassArmId_fkey" FOREIGN KEY ("fromClassArmId") REFERENCES "class_arms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_promotions" ADD CONSTRAINT "student_promotions_toClassArmId_fkey" FOREIGN KEY ("toClassArmId") REFERENCES "class_arms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_promotions" ADD CONSTRAINT "student_promotions_fromLevelId_fkey" FOREIGN KEY ("fromLevelId") REFERENCES "levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_promotions" ADD CONSTRAINT "student_promotions_toLevelId_fkey" FOREIGN KEY ("toLevelId") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_promotions" ADD CONSTRAINT "student_promotions_fromAcademicSessionId_fkey" FOREIGN KEY ("fromAcademicSessionId") REFERENCES "academic_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_promotions" ADD CONSTRAINT "student_promotions_toAcademicSessionId_fkey" FOREIGN KEY ("toAcademicSessionId") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_progressions" ADD CONSTRAINT "level_progressions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_progressions" ADD CONSTRAINT "level_progressions_fromLevelId_fkey" FOREIGN KEY ("fromLevelId") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_progressions" ADD CONSTRAINT "level_progressions_toLevelId_fkey" FOREIGN KEY ("toLevelId") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_batches" ADD CONSTRAINT "promotion_batches_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_batches" ADD CONSTRAINT "promotion_batches_fromAcademicSessionId_fkey" FOREIGN KEY ("fromAcademicSessionId") REFERENCES "academic_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_batches" ADD CONSTRAINT "promotion_batches_toAcademicSessionId_fkey" FOREIGN KEY ("toAcademicSessionId") REFERENCES "academic_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
