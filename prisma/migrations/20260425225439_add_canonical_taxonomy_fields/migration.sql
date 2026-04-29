-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "canonicalLevelCode" TEXT,
ADD COLUMN     "canonicalSubjectName" TEXT,
ADD COLUMN     "canonicalTermName" TEXT;

-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN     "canonicalLevelCode" TEXT,
ADD COLUMN     "canonicalSubjectName" TEXT,
ADD COLUMN     "canonicalTermName" TEXT;

-- CreateIndex
CREATE INDEX "questions_canonicalSubjectName_canonicalLevelCode_idx" ON "questions"("canonicalSubjectName", "canonicalLevelCode");

-- CreateIndex
CREATE INDEX "quizzes_canonicalSubjectName_canonicalLevelCode_idx" ON "quizzes"("canonicalSubjectName", "canonicalLevelCode");
