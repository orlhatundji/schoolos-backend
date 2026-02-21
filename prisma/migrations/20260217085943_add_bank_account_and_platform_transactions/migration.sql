-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SETTLED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "school_bank_accounts" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "paystackSubaccountCode" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "school_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_transactions" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentPaymentId" TEXT,
    "paymentReference" TEXT NOT NULL,
    "totalCharged" DECIMAL(10,2) NOT NULL,
    "feeAmount" DECIMAL(10,2) NOT NULL,
    "platformCommission" DECIMAL(10,2) NOT NULL,
    "paystackFee" DECIMAL(10,2) NOT NULL,
    "commissionRate" DECIMAL(5,4) NOT NULL DEFAULT 0.01,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "school_bank_accounts_schoolId_key" ON "school_bank_accounts"("schoolId");

-- CreateIndex
CREATE INDEX "school_bank_accounts_schoolId_idx" ON "school_bank_accounts"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_transactions_paymentReference_key" ON "platform_transactions"("paymentReference");

-- CreateIndex
CREATE INDEX "platform_transactions_schoolId_idx" ON "platform_transactions"("schoolId");

-- CreateIndex
CREATE INDEX "platform_transactions_status_idx" ON "platform_transactions"("status");

-- CreateIndex
CREATE INDEX "platform_transactions_paymentReference_idx" ON "platform_transactions"("paymentReference");

-- AddForeignKey
ALTER TABLE "school_bank_accounts" ADD CONSTRAINT "school_bank_accounts_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_transactions" ADD CONSTRAINT "platform_transactions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_transactions" ADD CONSTRAINT "platform_transactions_studentPaymentId_fkey" FOREIGN KEY ("studentPaymentId") REFERENCES "student_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
