-- School invoice types — add `type` enum + nullable title/description columns,
-- swap the full unique constraint on (school_id, term_id) for a partial unique
-- index scoped to type = 'PLATFORM_SERVICE' so CUSTOM invoices (added later)
-- can coexist many-per-term.

-- 1. Enum
CREATE TYPE "SchoolInvoiceType" AS ENUM ('PLATFORM_SERVICE', 'CUSTOM');

-- 2. Columns (existing rows default to PLATFORM_SERVICE)
ALTER TABLE "school_invoices"
  ADD COLUMN "type" "SchoolInvoiceType" NOT NULL DEFAULT 'PLATFORM_SERVICE',
  ADD COLUMN "title" TEXT,
  ADD COLUMN "description" TEXT;

-- 3. Replace the full unique with a partial unique index scoped to PLATFORM_SERVICE
DROP INDEX "school_invoices_schoolId_termId_key";

CREATE UNIQUE INDEX "school_invoices_one_platform_service_per_term"
  ON "school_invoices" ("schoolId", "termId")
  WHERE "type" = 'PLATFORM_SERVICE';

-- 4. Plain index for type-aware lookups
CREATE INDEX "school_invoices_schoolId_termId_type_idx"
  ON "school_invoices" ("schoolId", "termId", "type");
