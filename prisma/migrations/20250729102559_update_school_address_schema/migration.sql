/*
  Warnings:

  - You are about to drop the column `isPrimary` on the `SchoolAddress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "School" ADD COLUMN     "primaryAddressId" TEXT;

-- AlterTable
ALTER TABLE "SchoolAddress" DROP COLUMN "isPrimary";

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_primaryAddressId_fkey" FOREIGN KEY ("primaryAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
