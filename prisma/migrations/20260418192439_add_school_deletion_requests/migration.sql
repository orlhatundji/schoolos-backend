-- CreateEnum
CREATE TYPE "SchoolDeletionRequestStatus" AS ENUM ('PENDING', 'CANCELLED', 'EXECUTED', 'REJECTED');

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "school_deletion_requests" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "SchoolDeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewableAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancellationNote" TEXT,
    "executedAt" TIMESTAMP(3),
    "executedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "school_deletion_requests_schoolId_status_idx" ON "school_deletion_requests"("schoolId", "status");

-- CreateIndex
CREATE INDEX "school_deletion_requests_status_idx" ON "school_deletion_requests"("status");

-- AddForeignKey
ALTER TABLE "school_deletion_requests" ADD CONSTRAINT "school_deletion_requests_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_deletion_requests" ADD CONSTRAINT "school_deletion_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_deletion_requests" ADD CONSTRAINT "school_deletion_requests_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_deletion_requests" ADD CONSTRAINT "school_deletion_requests_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "system_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_deletion_requests" ADD CONSTRAINT "school_deletion_requests_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "system_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
