import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';

import { IJwtPayload } from '../../components/auth/strategies/jwt/types';

export const SchoolId = createParamDecorator((_: undefined, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user as IJwtPayload | undefined;
  if (!user?.schoolId) {
    throw new ForbiddenException('User is not associated with a school');
  }
  return user.schoolId;
});
