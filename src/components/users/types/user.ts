import {
  Admin,
  Guardian,
  User as PrismaUser,
  School,
  Student,
  Teacher,
  UserToken,
  Address,
} from '@prisma/client';

export interface User extends PrismaUser {
  school?: School;
  tokens?: UserToken[];
  student?: Student;
  guardian?: Guardian;
  teacher?: Teacher;
  admin?: Admin;
  address?: Address;
}
