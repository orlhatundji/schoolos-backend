import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { StrategyEnum } from '../../strategy.enum';
import { Encryptor } from '../../../../../utils/encryptor';
import { PublicDecoratorKey, RefreshTokenDecoratorKey } from '../../../../../common/decorators';

@Injectable()
export class AccessTokenGuard extends AuthGuard(StrategyEnum.JWT) {
  constructor(
    private reflector: Reflector,
    private readonly encryptor: Encryptor,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride(PublicDecoratorKey, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const isGuardedByRefreshToken = this.reflector.getAllAndOverride(RefreshTokenDecoratorKey, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic || isGuardedByRefreshToken) return true;

    const req = context.switchToHttp().getRequest();
    this._decryptBearerToken(req);
    return super.canActivate(context);
  }

  private _decryptBearerToken(req: any) {
    const bearerToken = req.headers?.authorization;
    if (!bearerToken) return;
    const token = req.headers?.authorization?.split(' ')[1];
    const decryptedToken = this.encryptor.decrypt(token);
    const decryptedBearerToken = `Bearer ${decryptedToken}`;
    req.headers.authorization = decryptedBearerToken;
  }
}
