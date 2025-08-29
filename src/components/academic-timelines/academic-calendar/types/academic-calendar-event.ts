import {
  AcademicSessionCalendarItem as PrismaAcademicSessionCalendarItem,
  AcademicSessionCalendar,
  AcademicSession,
  Term,
} from '@prisma/client';

export interface AcademicCalendarEvent extends PrismaAcademicSessionCalendarItem {
  calendar: AcademicSessionCalendar & {
    academicSession: AcademicSession & {
      terms: Term[];
    };
  };
}
