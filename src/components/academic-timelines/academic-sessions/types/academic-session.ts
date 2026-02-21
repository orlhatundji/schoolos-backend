import {
  AcademicSession as PrismaAcademicSession,
  AcademicSessionCalendar,
  StudentAttendance,
  Term,
} from '@prisma/client';

export interface AcademicSession extends PrismaAcademicSession {
  calendar?: AcademicSessionCalendar;
  studentAttendances?: StudentAttendance[];
  terms?: Term[];
}
