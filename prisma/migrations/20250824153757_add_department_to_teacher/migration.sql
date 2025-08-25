-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "departmentId" TEXT;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
