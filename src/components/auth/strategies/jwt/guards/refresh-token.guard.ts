import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Encryptor } from '../../../../../utils/encryptor';
import { StrategyEnum } from '../../strategy.enum';

@Injectable()
export class RefreshTokenGuard extends AuthGuard(StrategyEnum.JWT_REFRESH) {
  private readonly encryptor: Encryptor;
  constructor() {
    super();
    this.encryptor = new Encryptor();
  }

  canActivate(context: ExecutionContext) {
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
