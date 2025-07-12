import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayloadWithRt } from '../../components/auth/strategies/jwt/types';

export const GetCurrentUser = createParamDecorator(
  (data: keyof JwtPayloadWithRt | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    request.user.id = `${request.user.sub}`;
    if (!data) return request.user;
    return request.user[data];
  },
);
