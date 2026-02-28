import { Term as PrismaTerm, StudentAttendance, ClassArmStudentAssessment } from '@prisma/client';

export interface Term extends PrismaTerm {
  studentAttendance?: StudentAttendance[];
  assessments?: ClassArmStudentAssessment[];
  isCurrent?: boolean;
}
