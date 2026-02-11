-- AlterTable
ALTER TABLE "students" ADD COLUMN     "address" JSONB,
ADD COLUMN     "guardianEmail" TEXT,
ADD COLUMN     "guardianFirstName" TEXT,
ADD COLUMN     "guardianLastName" TEXT,
ADD COLUMN     "guardianPhone" TEXT;
