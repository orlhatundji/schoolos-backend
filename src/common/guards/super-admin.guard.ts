import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { UserTypes } from '../../components/users/constants';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    if (user?.type !== UserTypes.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can perform this action');
    }
    return true;
  }
}
