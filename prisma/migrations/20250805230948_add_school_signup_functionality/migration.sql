-- CreateEnum
CREATE TYPE "SchoolSignupStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('PRIMARY', 'SECONDARY', 'MIXED');

-- CreateTable
CREATE TABLE "school_signup_requests" (
    "id" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "schoolCode" TEXT NOT NULL,
    "contactPerson" JSONB NOT NULL,
    "address" JSONB NOT NULL,
    "schoolDetails" JSONB NOT NULL,
    "status" "SchoolSignupStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "notes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_signup_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "school_signup_requests_schoolCode_key" ON "school_signup_requests"("schoolCode");

-- AddForeignKey
ALTER TABLE "school_signup_requests" ADD CONSTRAINT "school_signup_requests_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
