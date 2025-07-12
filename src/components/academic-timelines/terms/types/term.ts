import { Term as PrismaTerm, StudentAttendance, SubjectTermStudent } from '@prisma/client';

export interface Term extends PrismaTerm {
  studentAttendance?: StudentAttendance[];
  subjectTermStudent?: SubjectTermStudent[];
}
