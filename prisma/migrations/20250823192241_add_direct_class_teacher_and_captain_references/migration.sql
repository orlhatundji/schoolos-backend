/*
  Warnings:

  - A unique constraint covering the columns `[captainId]` on the table `class_arms` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "class_arms" ADD COLUMN     "captainId" TEXT,
ADD COLUMN     "classTeacherId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "class_arms_captainId_key" ON "class_arms"("captainId");

-- AddForeignKey
ALTER TABLE "class_arms" ADD CONSTRAINT "class_arms_classTeacherId_fkey" FOREIGN KEY ("classTeacherId") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_arms" ADD CONSTRAINT "class_arms_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;
