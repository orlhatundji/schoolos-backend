-- DropIndex
DROP INDEX "levels_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "levels_code_schoolId_key" ON "levels"("code", "schoolId");
