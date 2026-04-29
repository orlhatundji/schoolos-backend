import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { UserTypes } from '../../components/users/constants';

/**
 * Allows any user whose `User.type` is `SYSTEM_ADMIN` — that includes
 * PLATFORM_ADMIN and any future `SystemAdmin.role` (e.g. SUPPORT_ADMIN,
 * CONTENT_MODERATOR). PLATFORM_ADMIN is the highest-privilege internal role
 * and must satisfy every gate that any system admin satisfies; do NOT tighten
 * this guard to inspect `SystemAdmin.role`. Use a separate guard for
 * role-specific restrictions.
 */
@Injectable()
export class SystemAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    if (user?.type !== UserTypes.SYSTEM_ADMIN) {
      throw new ForbiddenException('Only system admins can perform this action');
    }
    return true;
  }
}
