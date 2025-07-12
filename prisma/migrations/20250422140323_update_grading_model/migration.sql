/*
  Warnings:

  - A unique constraint covering the columns `[schoolId]` on the table `GradingModel` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "GradingModel_schoolId_key" ON "GradingModel"("schoolId");
