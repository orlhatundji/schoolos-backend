-- CreateEnum
CREATE TYPE "PaymentFrequency" AS ENUM ('ONCE_PER_SESSION', 'ONCE_PER_TERM', 'MONTHLY', 'WEEKLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'PARTIAL', 'WAIVED');

-- CreateEnum
CREATE TYPE "PaymentCategory" AS ENUM ('TUITION', 'EXAMINATION', 'LIBRARY', 'LABORATORY', 'SPORTS', 'TRANSPORT', 'UNIFORM', 'TEXTBOOK', 'EXCURSION', 'OTHER');

-- CreateTable
CREATE TABLE "payment_structures" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "category" "PaymentCategory" NOT NULL,
    "frequency" "PaymentFrequency" NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicSessionId" TEXT,
    "termId" TEXT,
    "levelId" TEXT,
    "classArmId" TEXT,
    "dueDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "payment_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_payments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "paymentStructureId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "waivedBy" TEXT,
    "waivedAt" TIMESTAMP(3),
    "waiverReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "student_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_structures_schoolId_idx" ON "payment_structures"("schoolId");

-- CreateIndex
CREATE INDEX "payment_structures_academicSessionId_idx" ON "payment_structures"("academicSessionId");

-- CreateIndex
CREATE INDEX "payment_structures_termId_idx" ON "payment_structures"("termId");

-- CreateIndex
CREATE INDEX "payment_structures_levelId_idx" ON "payment_structures"("levelId");

-- CreateIndex
CREATE INDEX "payment_structures_classArmId_idx" ON "payment_structures"("classArmId");

-- CreateIndex
CREATE INDEX "student_payments_studentId_idx" ON "student_payments"("studentId");

-- CreateIndex
CREATE INDEX "student_payments_paymentStructureId_idx" ON "student_payments"("paymentStructureId");

-- CreateIndex
CREATE INDEX "student_payments_dueDate_idx" ON "student_payments"("dueDate");

-- AddForeignKey
ALTER TABLE "payment_structures" ADD CONSTRAINT "payment_structures_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_structures" ADD CONSTRAINT "payment_structures_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "academic_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_structures" ADD CONSTRAINT "payment_structures_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_structures" ADD CONSTRAINT "payment_structures_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_structures" ADD CONSTRAINT "payment_structures_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "class_arms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_payments" ADD CONSTRAINT "student_payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_payments" ADD CONSTRAINT "student_payments_paymentStructureId_fkey" FOREIGN KEY ("paymentStructureId") REFERENCES "payment_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
