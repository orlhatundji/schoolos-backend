import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AssessmentsFeatureGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const schoolId: string | undefined = request?.user?.schoolId;
    if (!schoolId) {
      throw new ForbiddenException({
        code: 'ASSESSMENTS_DISABLED',
        message: 'Your school has not enabled Assessments.',
      });
    }
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { assessmentsEnabled: true },
    });
    if (!school?.assessmentsEnabled) {
      throw new ForbiddenException({
        code: 'ASSESSMENTS_DISABLED',
        message: 'Your school has not enabled Assessments.',
      });
    }
    return true;
  }
}
