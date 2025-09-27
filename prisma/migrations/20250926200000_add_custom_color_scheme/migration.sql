-- Add customColorScheme to UserPreferences
ALTER TABLE "user_preferences" ADD COLUMN "customColorScheme" TEXT DEFAULT 'default';
