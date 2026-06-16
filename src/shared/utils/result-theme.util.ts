export const RESULT_PHOTO_STYLES = ['rounded', 'square'] as const;
export type ResultPhotoStyle = (typeof RESULT_PHOTO_STYLES)[number];

export const TEMPLATE_DEFAULT_THEME_COLORS: Record<string, string> = {
  classic: '#3498db',
  traditional: '#1a3c5e',
  professional: '#333333',
  'report-sheet': '#1b5e3b',
};

const HEX_COLOR_RE = /^#([0-9a-fA-F]{6})$/;

export function isValidHexColor(color: string): boolean {
  return HEX_COLOR_RE.test(color);
}

export function resolveResultThemeColor(
  templateId: string,
  schoolColor?: string | null,
): string {
  if (schoolColor && isValidHexColor(schoolColor)) {
    return schoolColor.toLowerCase();
  }
  return TEMPLATE_DEFAULT_THEME_COLORS[templateId] ?? TEMPLATE_DEFAULT_THEME_COLORS.professional;
}

export function resolveResultPhotoBorderRadius(style?: string | null): string {
  return style === 'square' ? '0' : '50%';
}

export function resolveResultPhotoStyle(style?: string | null): ResultPhotoStyle {
  return style === 'square' ? 'square' : 'rounded';
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relative luminance per WCAG (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** Pick light or dark text for readable contrast on a theme background. */
export function suggestResultThemeTextColor(themeColor: string): string {
  return relativeLuminance(themeColor) > 0.179 ? '#1a1a1a' : '#ffffff';
}

export function resolveResultThemeTextColor(
  themeColor: string,
  schoolTextColor?: string | null,
): string {
  if (schoolTextColor && isValidHexColor(schoolTextColor)) {
    return schoolTextColor.toLowerCase();
  }
  return suggestResultThemeTextColor(themeColor);
}

/** Light tint for alternating table rows (hex + alpha). */
export function hexWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
