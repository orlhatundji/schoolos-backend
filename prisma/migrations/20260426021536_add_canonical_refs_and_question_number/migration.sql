/*
  Warnings:

  - You are about to drop the column `paperReference` on the `question_popular_exams` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "question_popular_exams" DROP COLUMN "paperReference",
ADD COLUMN     "questionNumber" TEXT;

-- CreateTable
CREATE TABLE "canonical_subjects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "canonical_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canonical_levels" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "canonical_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canonical_terms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "canonical_terms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "canonical_subjects_name_key" ON "canonical_subjects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "canonical_subjects_slug_key" ON "canonical_subjects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "canonical_levels_code_key" ON "canonical_levels"("code");

-- CreateIndex
CREATE INDEX "canonical_levels_group_order_idx" ON "canonical_levels"("group", "order");

-- CreateIndex
CREATE UNIQUE INDEX "canonical_terms_name_key" ON "canonical_terms"("name");
