import {
  ClassArm,
  ClassArmStudent,
  ClassArmStudentAssessment,
  Guardian,
  Student as PrismaStudent,
  School,
  StudentAttendance,
  Level,
  User as PrismaUser,
} from '@prisma/client';
import { User } from '../../users/types';

export interface Student extends PrismaStudent {
  user?: User;
  classArmStudents?: ClassArmStudent[];
  assessments?: ClassArmStudentAssessment[];
  guardian?: Guardian;
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
