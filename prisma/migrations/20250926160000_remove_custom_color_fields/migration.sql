-- Remove custom color fields from user_preferences table
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "customPrimaryColor";
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "customSecondaryColor";
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "customAccentColor";
