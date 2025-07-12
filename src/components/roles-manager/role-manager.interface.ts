import { User } from '@prisma/client';

export interface IRoleManager {
  createUserPermissions(user: User);
}
