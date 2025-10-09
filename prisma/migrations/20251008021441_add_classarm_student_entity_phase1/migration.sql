-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_classArmId_fkey";

-- AlterTable
ALTER TABLE "student_attendances" ADD COLUMN     "classArmStudentId" TEXT;

-- AlterTable
ALTER TABLE "students" ALTER COLUMN "classArmId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "class_arm_students" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classArmId" TEXT NOT NULL,
    "academicSessionId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "class_arm_students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_arm_students_studentId_idx" ON "class_arm_students"("studentId");

-- CreateIndex
CREATE INDEX "class_arm_students_classArmId_idx" ON "class_arm_students"("classArmId");

-- CreateIndex
CREATE INDEX "class_arm_students_academicSessionId_idx" ON "class_arm_students"("academicSessionId");

-- CreateIndex
CREATE INDEX "class_arm_students_isActive_idx" ON "class_arm_students"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "class_arm_students_studentId_classArmId_academicSessionId_key" ON "class_arm_students"("studentId", "classArmId", "academicSessionId");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "class_arms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arm_students" ADD CONSTRAINT "class_arm_students_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arm_students" ADD CONSTRAINT "class_arm_students_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "class_arms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arm_students" ADD CONSTRAINT "class_arm_students_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_classArmStudentId_fkey" FOREIGN KEY ("classArmStudentId") REFERENCES "class_arm_students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
