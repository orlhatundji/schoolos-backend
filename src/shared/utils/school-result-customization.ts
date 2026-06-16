/** School report-card customization fields (Prisma School after migration). */
export interface SchoolResultCustomizationFields {
  resultThemeColor?: string | null;
  resultThemeTextColor?: string | null;
  resultPhotoStyle?: string | null;
  resultPaperSize?: string | null;
}

export function pickSchoolResultCustomization(
  school: SchoolResultCustomizationFields | null | undefined,
) {
  return {
    resultThemeColor: school?.resultThemeColor ?? undefined,
    resultThemeTextColor: school?.resultThemeTextColor ?? undefined,
    resultPhotoStyle: school?.resultPhotoStyle ?? 'rounded',
    resultPaperSize: school?.resultPaperSize ?? 'letter',
  };
}
