-- CreateEnum
CREATE TYPE "BulkImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "bulk_import_jobs" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "totalRecords" INTEGER NOT NULL,
    "processedRecords" INTEGER NOT NULL DEFAULT 0,
    "successfulRecords" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "status" "BulkImportStatus" NOT NULL DEFAULT 'PENDING',
    "options" JSONB,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_import_errors" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "fieldName" TEXT,
    "errorMessage" TEXT NOT NULL,
    "fieldValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_import_errors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bulk_import_jobs_schoolId_idx" ON "bulk_import_jobs"("schoolId");

-- CreateIndex
CREATE INDEX "bulk_import_jobs_userId_idx" ON "bulk_import_jobs"("userId");

-- CreateIndex
CREATE INDEX "bulk_import_jobs_status_idx" ON "bulk_import_jobs"("status");

-- CreateIndex
CREATE INDEX "bulk_import_jobs_createdAt_idx" ON "bulk_import_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "bulk_import_errors_jobId_idx" ON "bulk_import_errors"("jobId");

-- CreateIndex
CREATE INDEX "bulk_import_errors_rowNumber_idx" ON "bulk_import_errors"("rowNumber");

-- AddForeignKey
ALTER TABLE "bulk_import_jobs" ADD CONSTRAINT "bulk_import_jobs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_import_jobs" ADD CONSTRAINT "bulk_import_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_import_errors" ADD CONSTRAINT "bulk_import_errors_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "bulk_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
