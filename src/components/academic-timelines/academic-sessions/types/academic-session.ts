import {
  AcademicSession as PrismaAcademicSession,
  AcademicSessionCalendar,
  StudentAttendance,
} from '@prisma/client';
import { Term } from '../../terms/types';

export interface AcademicSession extends PrismaAcademicSession {
  calendar?: AcademicSessionCalendar;
  studentAttendances?: StudentAttendance[];
  terms?: Term[];
  isCurrent?: boolean;
}
