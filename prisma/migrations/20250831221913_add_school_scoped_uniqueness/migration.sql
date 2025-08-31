/*
  Warnings:

  - A unique constraint covering the columns `[email,schoolId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone,schoolId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "users_email_key";

-- DropIndex
DROP INDEX "users_phone_key";

-- CreateIndex
CREATE UNIQUE INDEX "users_email_schoolId_key" ON "users"("email", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_schoolId_key" ON "users"("phone", "schoolId");
