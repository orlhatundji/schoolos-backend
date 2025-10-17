import { UserType } from '@prisma/client';

export interface IJwtPayload {
  email: string;
  sub: string;
  type: UserType;
  schoolId: string;
}
