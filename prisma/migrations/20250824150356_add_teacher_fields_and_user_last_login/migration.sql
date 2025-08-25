-- CreateEnum
CREATE TYPE "TeacherStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT');

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
ADD COLUMN     "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "qualification" TEXT,
ADD COLUMN     "status" "TeacherStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);
