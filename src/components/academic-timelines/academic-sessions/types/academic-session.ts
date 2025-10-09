import {
  AcademicSession as PrismaAcademicSession,
  AcademicSessionCalendar,
  StudentAttendance,
  SubjectTermStudent,
  Term,
} from '@prisma/client';

export interface AcademicSession extends PrismaAcademicSession {
  calendar?: AcademicSessionCalendar;
  studentAttendances?: StudentAttendance[];
  subjectTermStudents?: SubjectTermStudent[];
  terms?: Term[];
}
