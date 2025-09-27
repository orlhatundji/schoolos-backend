-- Add schoolColorScheme field to user_preferences table
ALTER TABLE "user_preferences" ADD COLUMN "schoolColorScheme" TEXT DEFAULT 'default';
