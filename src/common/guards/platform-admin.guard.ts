import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { UserTypes } from '../../components/users/constants';

/**
 * Hard gate for the highest-privilege internal role (`SystemAdmin.role =
 * 'PLATFORM_ADMIN'`). Use ONLY for actions that should be reserved to the
 * bootstrap super (e.g. running seed scripts on production, bootstrap
 * tenant operations). Every other system-admin route should keep using
 * `SystemAdminGuard` — see its file header for rationale.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    if (user?.type !== UserTypes.SYSTEM_ADMIN) {
      throw new ForbiddenException('Only platform admins can perform this action');
    }
    const systemAdmin = await this.prisma.systemAdmin.findFirst({
      where: { userId: user.sub ?? user.id },
      select: { role: true },
    });
    if (systemAdmin?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admins can perform this action');
    }
    return true;
  }
}
