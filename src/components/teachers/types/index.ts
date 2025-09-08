import { Teacher as PrismaTeacher, User } from '@prisma/client';

export interface Teacher extends PrismaTeacher {
  user: User;
  department?: {
    id: string;
    name: string;
  };
}
