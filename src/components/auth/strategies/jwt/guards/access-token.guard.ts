import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { PublicDecoratorKey, RefreshTokenDecoratorKey } from '../../../../../common/decorators';
import { Encryptor } from '../../../../../utils/encryptor';
import { StrategyEnum } from '../../strategy.enum';

@Injectable()
export class AccessTokenGuard extends AuthGuard(StrategyEnum.JWT) {
  constructor(
    private reflector: Reflector,
    private readonly encryptor: Encryptor,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // return true;
    const isPublic = this.reflector.getAllAndOverride(PublicDecoratorKey, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const isGuardedByRefreshToken = this.reflector.getAllAndOverride(RefreshTokenDecoratorKey, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isGuardedByRefreshToken) return true;

    const req = context.switchToHttp().getRequest();
    this._decryptBearerToken(req);
    return super.canActivate(context);
  }

  private _decryptBearerToken(req: any) {
    const authorization = req.headers?.authorization;
    if (!authorization) return;
    console.log('authorization:', authorization);
    const token = authorization.split(' ')[1];
    console.log('token:', token);

    // Check if token looks like an encrypted token (has colon separator)
    if (token.includes(':')) {
      try {
        const decryptedToken = this.encryptor.decrypt(token);
        const decryptedBearerToken = `Bearer ${decryptedToken}`;
        req.headers.authorization = decryptedBearerToken;
        console.log('Successfully decrypted token');
      } catch (error) {
        console.log('Decryption failed, treating as plain JWT:', error.message);
        // If decryption fails, assume it's already a plain JWT and leave it as is
      }
    } else {
      console.log('Token appears to be plain JWT, no decryption needed');
      // Token doesn't look encrypted, leave it as is
    }
  }
}
