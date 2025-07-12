import {
  AcademicSession as PrismaAcademicSession,
  AcademicSessionCalendar,
  StudentAttendance,
  SubjectTermStudent,
} from '@prisma/client';

export interface AcademicSession extends PrismaAcademicSession {
  calendar?: AcademicSessionCalendar;
  studentAttendances?: StudentAttendance[];
  subjectTermStudents?: SubjectTermStudent[];
}
