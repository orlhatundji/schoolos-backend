-- DropIndex
DROP INDEX "departments_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_schoolId_key" ON "departments"("code", "schoolId");
