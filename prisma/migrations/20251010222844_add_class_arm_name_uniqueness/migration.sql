-- CreateIndex
CREATE UNIQUE INDEX "unique_class_arm_per_level_session" ON "class_arms"("name", "levelId", "academicSessionId", "schoolId");
