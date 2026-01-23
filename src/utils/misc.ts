import { UserType } from '@prisma/client';

const entityMap: Record<UserType, string> = {
  STUDENT: 'S',
  TEACHER: 'T',
  GUARDIAN: 'G',
  ADMIN: 'A',
  SUPER_ADMIN: 'SA',
  SYSTEM_ADMIN: 'SYS-ADM',
};

/**
 * @param entityType UserType - student, teacher, etc
 * @param schoolCode e.g BRF4
 * @param date Date
 * @param nextSeq the next sequence number
 * @returns a formatted string: example: BRF4/T/25/0034
 */
export const getNextUserEntityNoFormatted = (
  entityType: UserType,
  schoolCode: string,
  date: Date | string,
  nextSeq: number,
) => {
  const paddedNextSeq = nextSeq.toString().padStart(4, '0');
  const twoDigitYear = new Date(date).getFullYear().toString().slice(-2);
  return `${schoolCode}/${entityMap[entityType]}/${twoDigitYear}/${paddedNextSeq}`;
};

/**
 * Common words to skip when generating acronyms
 */
const SKIP_WORDS = new Set([
  'the',
  'of',
  'and',
  'for',
  'a',
  'an',
  'in',
  'at',
  'to',
  'is',
]);

/**
 * Generates an acronym from a school name by taking the first letter of each significant word.
 * Skips common words like "the", "of", "and", etc.
 * @param schoolName - The full name of the school (e.g., "Bright Future High School")
 * @param maxLength - Maximum length of the acronym (default: 4)
 * @returns The acronym in uppercase (e.g., "BFHS")
 */
export const generateSchoolAcronym = (
  schoolName: string,
  maxLength: number = 4,
): string => {
  if (!schoolName || typeof schoolName !== 'string') {
    return 'SCH'; // Default fallback
  }

  const acronym = schoolName
    .split(/\s+/)
    .filter((word) => word.length > 0 && !SKIP_WORDS.has(word.toLowerCase()))
    .map((word) => word[0].toUpperCase())
    .join('')
    .slice(0, maxLength);

  // Ensure we have at least 2 characters
  return acronym.length >= 2 ? acronym : 'SCH';
};

/**
 * Generates a unique school code by combining the school name acronym with a sequence number.
 * Format: {ACRONYM} for first school, {ACRONYM}{SEQ} for subsequent (e.g., "BFH", "BFH2", "BFH81")
 * @param schoolName - The full name of the school
 * @param sequenceNo - The sequence number from the global counter
 * @returns The formatted school code
 */
export const generateSchoolCode = (
  schoolName: string,
  sequenceNo: number,
): string => {
  const acronym = generateSchoolAcronym(schoolName);
  // First school with this acronym gets just the prefix, subsequent ones get prefix + number
  if (sequenceNo === 1) {
    return acronym;
  }
  return `${acronym}${sequenceNo}`;
};
