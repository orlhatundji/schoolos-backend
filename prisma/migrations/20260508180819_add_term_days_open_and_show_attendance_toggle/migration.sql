-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "show_attendance_on_report" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "terms" ADD COLUMN     "days_open" INTEGER;
