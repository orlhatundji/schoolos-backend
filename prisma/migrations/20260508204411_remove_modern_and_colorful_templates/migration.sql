-- The 'modern' and 'colorful' result-card templates were removed. Any school
-- currently pointing at them is migrated to the default 'professional' template
-- so PDF generation does not fail with "Template not found".
UPDATE "schools"
SET "result_template_id" = 'professional'
WHERE "result_template_id" IN ('modern', 'colorful');
