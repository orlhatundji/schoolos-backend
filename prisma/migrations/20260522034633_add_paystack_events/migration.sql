-- CreateEnum
CREATE TYPE "PaystackEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED');

-- CreateTable
CREATE TABLE "paystack_events" (
    "id" TEXT NOT NULL,
    "paystackEventId" BIGINT NOT NULL,
    "eventType" TEXT NOT NULL,
    "reference" TEXT,
    "payload" JSONB NOT NULL,
    "status" "PaystackEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paystack_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "paystack_events_paystackEventId_key" ON "paystack_events"("paystackEventId");

-- CreateIndex
CREATE INDEX "paystack_events_reference_idx" ON "paystack_events"("reference");

-- CreateIndex
CREATE INDEX "paystack_events_eventType_idx" ON "paystack_events"("eventType");

-- CreateIndex
CREATE INDEX "paystack_events_status_idx" ON "paystack_events"("status");
