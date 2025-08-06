-- AlterEnum
ALTER TYPE "UserType" ADD VALUE 'SYSTEM_ADMIN';

-- DropForeignKey
ALTER TABLE "school_signup_requests" DROP CONSTRAINT "school_signup_requests_reviewerId_fkey";

-- CreateTable
CREATE TABLE "system_admins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SYSTEM_ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "system_admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_admins_userId_key" ON "system_admins"("userId");

-- AddForeignKey
ALTER TABLE "system_admins" ADD CONSTRAINT "system_admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_signup_requests" ADD CONSTRAINT "school_signup_requests_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "system_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
