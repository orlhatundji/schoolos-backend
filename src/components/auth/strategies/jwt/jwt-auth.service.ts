import { Injectable } from '@nestjs/common';
import { BaseService } from '../../../../common/base-service';
import { ConfigService } from '@nestjs/config';
import { Encryptor } from '../../../../utils/encryptor';
import { JwtService } from '@nestjs/jwt';
import { AuthTokens, IJwtPayload } from './types';
import { User } from '../../../users/types';

@Injectable()
export class JwtAuthService extends BaseService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly encryptor: Encryptor,
  ) {
    super(JwtAuthService.name);
  }

  async getTokens(partialUser: Pick<User, 'id' | 'email' | 'type'>): Promise<AuthTokens> {
    const payload: IJwtPayload = {
      email: partialUser.email,
      sub: partialUser.id,
      type: partialUser.type,
    };

    const [accessToken, refreshToken] = await this._getTokensFromPayload(payload);

    const encryptedAccessToken = this.encryptor.encrypt(accessToken);
    const encryptedRefreshToken = this.encryptor.encrypt(refreshToken);

    return {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
    };
  }

  private async _getTokensFromPayload(payload: IJwtPayload): Promise<[string, string]> {
    return await Promise.all([
      this._signToken(payload, 'jwt.secret', 'jwt.expiresIn'),
      this._signToken(payload, 'jwt.refreshTokenSecret', 'jwt.refreshTokenAge'),
    ]);
  }

  private _signToken(
    payload: IJwtPayload,
    secretKey: string,
    expiresInKey: string,
  ): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>(secretKey),
      expiresIn: this.configService.get<string>(expiresInKey),
    });
  }

  public verifyRefreshToken(token: string) {
    const secret = this.configService.get<string>('jwt.refreshTokenSecret');
    return this.verifyToken(token, secret);
  }

  private verifyToken(token: string, secret: string) {
    return this.jwtService.verify(token, { secret });
  }
}
