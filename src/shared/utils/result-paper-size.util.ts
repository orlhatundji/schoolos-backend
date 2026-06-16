export const RESULT_PAPER_SIZES = ['letter', 'a4', 'legal'] as const;
export type ResultPaperSize = (typeof RESULT_PAPER_SIZES)[number];

export const DEFAULT_RESULT_PAPER_SIZE: ResultPaperSize = 'letter';

export const PDF_MARGIN_MM = 10;

export interface ResultPaperSpec {
  id: ResultPaperSize;
  label: string;
  description: string;
  widthMm: number;
  heightMm: number;
  puppeteerFormat: 'letter' | 'a4' | 'legal';
}

export const RESULT_PAPER_SPECS: Record<ResultPaperSize, ResultPaperSpec> = {
  letter: {
    id: 'letter',
    label: 'US Letter',
    description: '8.5 × 11 in — default, common in North America',
    widthMm: 215.9,
    heightMm: 279.4,
    puppeteerFormat: 'letter',
  },
  a4: {
    id: 'a4',
    label: 'A4',
    description: '210 × 297 mm — international standard',
    widthMm: 210,
    heightMm: 297,
    puppeteerFormat: 'a4',
  },
  legal: {
    id: 'legal',
    label: 'US Legal',
    description: '8.5 × 14 in — extra length for larger result sets',
    widthMm: 215.9,
    heightMm: 355.6,
    puppeteerFormat: 'legal',
  },
};

export const RESULT_PAPER_SIZE_INFO = RESULT_PAPER_SIZES.map((id) => {
  const spec = RESULT_PAPER_SPECS[id];
  return {
    id: spec.id,
    label: spec.label,
    description: spec.description,
  };
});

export function resolveResultPaperSize(size?: string | null): ResultPaperSize {
  if (size && (RESULT_PAPER_SIZES as readonly string[]).includes(size)) {
    return size as ResultPaperSize;
  }
  return DEFAULT_RESULT_PAPER_SIZE;
}

export function getResultPaperLayout(paperSize: ResultPaperSize, marginMm = PDF_MARGIN_MM) {
  const spec = RESULT_PAPER_SPECS[paperSize];
  const contentWidthMm = spec.widthMm - marginMm * 2;
  const contentHeightMm = spec.heightMm - marginMm * 2;

  return {
    spec,
    contentWidthMm,
    contentHeightMm,
    contentWidthPx: Math.round((contentWidthMm * 96) / 25.4),
    contentHeightPx: Math.round((contentHeightMm * 96) / 25.4),
    paperContentMinHeight: `${contentHeightMm}mm`,
  };
}
