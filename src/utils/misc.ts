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
