/** Display names follow calendar months (internal IDs unchanged for DB compatibility). */
export const RESULT_TEMPLATE_DISPLAY_NAMES: Record<string, string> = {
  classic: 'January',
  traditional: 'February',
  professional: 'March',
  'report-sheet': 'April',
};

export const RESULT_TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  classic: 'Dark header with coloured accent bars and summary box',
  traditional: 'Formal double-bordered layout with serif typography',
  professional: 'Minimal corporate style with grey header tones',
  'report-sheet': 'Full-width results table with watermark and term summary',
};

export function getResultTemplateDisplayName(templateId: string): string {
  return RESULT_TEMPLATE_DISPLAY_NAMES[templateId] ?? templateId;
}
