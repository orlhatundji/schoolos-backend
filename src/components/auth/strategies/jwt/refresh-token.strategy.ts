import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { StrategyEnum } from '../strategy.enum';
import { IJwtPayload, JwtPayloadWithRt } from './types';
import { UsersService } from '../../../users/users.service';
import { AuthMessages } from '../../results';
import { User } from '@prisma/client';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, StrategyEnum.JWT_REFRESH) {
  constructor(
    private readonly config: ConfigService,
    private userService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('jwt.refreshTokenSecret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: IJwtPayload): Promise<JwtPayloadWithRt> {
    const refreshToken = req?.get('authorization')?.replace('Bearer', '').trim();

    if (!refreshToken) throw new ForbiddenException(AuthMessages.FAILURE.TOKEN_NOT_FOUND);

    await this._findUserOrThrow(payload.email);

    return {
      ...payload,
      refreshToken,
    };
  }

  private async _findUserOrThrow(email: string): Promise<User> {
    const foundUser = await this.userService.findByEmail(email);
    if (!foundUser) {
      throw new ForbiddenException('Access Denied');
    }
    return foundUser;
  }
}
