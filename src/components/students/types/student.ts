import {
  ClassArm,
  CurriculumItemRating,
  Guardian,
  Student as PrismaStudent,
  School,
  StudentAttendance,
  SubjectTermStudent,
} from '@prisma/client';
import { User } from '../../users/types';

export interface Student extends PrismaStudent {
  user?: User;
  classArm?: ClassArm;
  subjectTermStudents?: SubjectTermStudent[];
  guardian?: Guardian;
  curriculumItemRatings?: CurriculumItemRating[];
  studentAttendances?: StudentAttendance[];
  school?: School[];
}
