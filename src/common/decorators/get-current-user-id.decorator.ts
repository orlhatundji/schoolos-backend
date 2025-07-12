import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IJwtPayload } from '../../components/auth/strategies/jwt/types';

export const GetCurrentUserId = createParamDecorator(
  (_: undefined, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as IJwtPayload;
    return user.sub;
  },
);
