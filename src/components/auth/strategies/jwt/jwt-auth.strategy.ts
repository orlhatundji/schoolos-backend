import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { User } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { StrategyEnum } from '../strategy.enum';
import { IJwtPayload } from './types';
import { UsersService } from '../../../users/users.service';
import { AuthMessages } from '../../results';

@Injectable()
export class JwtAuthStrategy extends PassportStrategy(Strategy, StrategyEnum.JWT) {
  constructor(
    private configService: ConfigService,
    private userService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('jwt.secret'),
      usernameField: 'emailAddress',
    });
  }

  async validate(payload: IJwtPayload) {
    // Use userId (sub) from JWT, not email - email is not unique across schools
    const user = await this._findUserOrThrow(payload.sub);
    return {
      sub: user.id,
      email: user.email,
      type: user.type,
      schoolId: user.schoolId,
    };
  }

  private async _findUserOrThrow(userId: string): Promise<User> {
    const foundUser = await this.userService.findById(userId);
    if (!foundUser) {
      throw new ForbiddenException(AuthMessages.FAILURE.ACCESS_DENIED);
    }
    return foundUser;
  }
}
