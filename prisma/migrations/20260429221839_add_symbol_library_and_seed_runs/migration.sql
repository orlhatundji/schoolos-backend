-- CreateEnum
CREATE TYPE "SeedRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "symbol_library_items" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latex" TEXT NOT NULL,
    "tags" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "symbol_library_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seed_runs" (
    "id" TEXT NOT NULL,
    "seedSlug" TEXT NOT NULL,
    "status" "SeedRunStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "upserted" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "notes" TEXT,
    "errorMessage" TEXT,
    "triggeredById" TEXT,

    CONSTRAINT "seed_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "symbol_library_items_category_isActive_order_idx" ON "symbol_library_items"("category", "isActive", "order");

-- CreateIndex
CREATE INDEX "symbol_library_items_isActive_idx" ON "symbol_library_items"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "symbol_library_items_category_name_key" ON "symbol_library_items"("category", "name");

-- CreateIndex
CREATE INDEX "seed_runs_seedSlug_startedAt_idx" ON "seed_runs"("seedSlug", "startedAt");

-- CreateIndex
CREATE INDEX "seed_runs_status_idx" ON "seed_runs"("status");

-- AddForeignKey
ALTER TABLE "seed_runs" ADD CONSTRAINT "seed_runs_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
