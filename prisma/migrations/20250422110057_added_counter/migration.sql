/*
  Warnings:

  - Added the required column `schoolId` to the `Department` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "schoolId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "School" ALTER COLUMN "code" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Counter" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Counter_schoolId_entity_key" ON "Counter"("schoolId", "entity");

-- CreateIndex
CREATE INDEX "Department_schoolId_idx" ON "Department"("schoolId");

-- AddForeignKey
ALTER TABLE "Counter" ADD CONSTRAINT "Counter_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Student_studentNumber_key" RENAME TO "Student_studentNo_key";

-- RenameIndex
ALTER INDEX "Teacher_teacherNumber_key" RENAME TO "Teacher_teacherNo_key";
