import {
  ClassArm,
  ClassArmStudent,
  CurriculumItemRating,
  Guardian,
  Student as PrismaStudent,
  School,
  StudentAttendance,
  SubjectTermStudent,
  Level,
  User as PrismaUser,
} from '@prisma/client';
import { User } from '../../users/types';

export interface Student extends PrismaStudent {
  user?: User;
  classArmStudents?: ClassArmStudent[];
  subjectTermStudents?: SubjectTermStudent[];
  guardian?: Guardian;
  curriculumItemRatings?: CurriculumItemRating[];
  studentAttendances?: StudentAttendance[];
  school?: School[];
}

// Type for Student with nested includes for the list endpoint
export interface StudentWithIncludes extends PrismaStudent {
  user: PrismaUser;
  classArmStudents: (ClassArmStudent & {
    classArm: ClassArm & {
      level: Level;
      school: School;
    };
  })[];
  guardian?: Guardian & {
    user: PrismaUser;
  };
}
