-- Drop unique constraints on email and phone for users table
-- This allows multiple users to have the same email/phone within a school

-- Drop the unique constraint on (email, schoolId)
DROP INDEX IF EXISTS "users_email_schoolId_key";

-- Drop the unique constraint on (phone, schoolId)
DROP INDEX IF EXISTS "users_phone_schoolId_key";
