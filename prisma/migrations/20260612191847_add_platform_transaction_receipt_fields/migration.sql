-- AlterTable
ALTER TABLE "platform_transactions" ADD COLUMN     "receiptSentAt" TIMESTAMP(3),
ADD COLUMN     "receiptUrl" TEXT;
