-- CreateEnum
CREATE TYPE "SubjectCategory" AS ENUM ('CORE', 'GENERAL', 'VOCATIONAL');

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "category" "SubjectCategory" NOT NULL DEFAULT 'CORE';
