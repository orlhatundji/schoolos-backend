-- Pricing overhaul: per-term school invoices + polymorphic platform transactions.
--
-- Migration steps:
--   1. Add new enums (PlatformTransactionOperation, SchoolInvoiceStatus, SchoolInvoicePaidVia).
--   2. Add nullable polymorphic columns on platform_transactions, then backfill
--      from studentPaymentId, then enforce NOT NULL.
--   3. Drop legacy platform_transactions columns: studentPaymentId, platformCommission, commissionRate.
--   4. Rebuild indices on platform_transactions to match new query shape.
--   5. Add School.serviceFeeOverride.
--   6. Create school_invoices table.

-- =============================================================================
-- Step 1 — enums
-- =============================================================================

CREATE TYPE "PlatformTransactionOperation" AS ENUM ('STUDENT_PAYMENT', 'SCHOOL_INVOICE');
CREATE TYPE "SchoolInvoiceStatus" AS ENUM ('ISSUED', 'PAID', 'WAIVED', 'CANCELLED');
CREATE TYPE "SchoolInvoicePaidVia" AS ENUM ('ONLINE', 'EXTERNAL');

-- =============================================================================
-- Step 2 — polymorphic columns on platform_transactions (nullable → backfill → NOT NULL)
-- =============================================================================

ALTER TABLE "platform_transactions"
  ADD COLUMN "operationType" "PlatformTransactionOperation",
  ADD COLUMN "operationId"   TEXT;

-- Backfill existing rows. Every existing row represents a settled or pending
-- student-payment charge (the only flow that wrote PlatformTransaction prior
-- to this migration), so STUDENT_PAYMENT is the correct value.
UPDATE "platform_transactions"
SET "operationType" = 'STUDENT_PAYMENT',
    "operationId"   = "studentPaymentId"
WHERE "studentPaymentId" IS NOT NULL;

-- If any rows had a NULL studentPaymentId (should be zero in practice — there
-- is no code path that wrote such a row), refuse to migrate them silently.
DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT count(*) INTO orphan_count
  FROM "platform_transactions"
  WHERE "operationType" IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION
      'Found % platform_transactions rows with NULL studentPaymentId. Manual decision required before migrating.',
      orphan_count;
  END IF;
END $$;

ALTER TABLE "platform_transactions"
  ALTER COLUMN "operationType" SET NOT NULL,
  ALTER COLUMN "operationId"   SET NOT NULL;

-- =============================================================================
-- Step 3 — drop legacy columns + FK on platform_transactions
-- =============================================================================

ALTER TABLE "platform_transactions"
  DROP CONSTRAINT IF EXISTS "platform_transactions_studentPaymentId_fkey";

ALTER TABLE "platform_transactions"
  DROP COLUMN "studentPaymentId",
  DROP COLUMN "platformCommission",
  DROP COLUMN "commissionRate";

-- =============================================================================
-- Step 4 — indices on platform_transactions
-- =============================================================================

DROP INDEX IF EXISTS "platform_transactions_schoolId_idx";
DROP INDEX IF EXISTS "platform_transactions_status_idx";
DROP INDEX IF EXISTS "platform_transactions_paymentReference_idx";

CREATE INDEX "platform_transactions_schoolId_status_idx"
  ON "platform_transactions"("schoolId", "status");

CREATE INDEX "platform_transactions_operationType_operationId_idx"
  ON "platform_transactions"("operationType", "operationId");

-- =============================================================================
-- Step 5 — School.serviceFeeOverride
-- =============================================================================

ALTER TABLE "schools"
  ADD COLUMN "serviceFeeOverride" DECIMAL(10, 2);

-- =============================================================================
-- Step 6 — school_invoices table
-- =============================================================================

CREATE TABLE "school_invoices" (
  "id"            TEXT NOT NULL,
  "schoolId"      TEXT NOT NULL,
  "termId"        TEXT NOT NULL,
  "status"        "SchoolInvoiceStatus" NOT NULL DEFAULT 'ISSUED',
  "studentCount"  INTEGER NOT NULL,
  "unitFee"       DECIMAL(10, 2) NOT NULL,
  "totalAmount"   DECIMAL(10, 2) NOT NULL,
  "issuedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt"        TIMESTAMP(3),
  "paidVia"       "SchoolInvoicePaidVia",
  "paidNote"      TEXT,
  "waivedAt"      TIMESTAMP(3),
  "waivedById"    TEXT,
  "waiverReason"  TEXT,
  "cancelledAt"   TIMESTAMP(3),
  "cancelledById" TEXT,
  "cancelReason"  TEXT,
  "editedAt"      TIMESTAMP(3),
  "editedById"    TEXT,
  "editReason"    TEXT,
  "pdfUrl"        TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,

  CONSTRAINT "school_invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "school_invoices_schoolId_termId_key"
  ON "school_invoices"("schoolId", "termId");

CREATE INDEX "school_invoices_status_idx"
  ON "school_invoices"("status");

CREATE INDEX "school_invoices_schoolId_status_idx"
  ON "school_invoices"("schoolId", "status");

ALTER TABLE "school_invoices"
  ADD CONSTRAINT "school_invoices_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "school_invoices_termId_fkey"
    FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "school_invoices_waivedById_fkey"
    FOREIGN KEY ("waivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "school_invoices_cancelledById_fkey"
    FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "school_invoices_editedById_fkey"
    FOREIGN KEY ("editedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
