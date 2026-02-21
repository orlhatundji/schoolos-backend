-- DropIndex
DROP INDEX "class_arms_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "class_arms_slug_schoolId_key" ON "class_arms"("slug", "schoolId");
