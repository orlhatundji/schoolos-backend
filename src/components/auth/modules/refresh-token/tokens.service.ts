import { BadRequestException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtAuthService } from '../../strategies/jwt/jwt-auth.service';
import { TokensRepository } from './tokens.repository';
import { BaseService } from '../../../../common/base-service';
import { ConfigService } from '@nestjs/config';
import { AuthMessages } from '../../results';
import { Encryptor } from '../../../../utils/encryptor';
import { UsersService } from '../../../users/users.service';
import { AuthTokens } from '../../strategies/jwt/types';
import { RefreshTokenResult } from './results';
import { TokenTypes } from './types';
import { UserTokenType } from '@prisma/client';

@Injectable()
export class TokensService extends BaseService {
  constructor(
    private readonly jwtAuthService: JwtAuthService,
    private readonly tokensRepository: TokensRepository,
    private readonly configService: ConfigService,
    private readonly encryptor: Encryptor,
    private readonly userService: UsersService,
  ) {
    super(TokensService.name);
  }

  async refreshToken(userId: string, refreshToken: string): Promise<RefreshTokenResult> {
    const foundRefreshToken = await this.tokensRepository.find({
      where: { userId },
    });

    if (!foundRefreshToken) {
      this.logger.error(`Refresh token not found for user: ${userId}`);
      throw new UnauthorizedException(AuthMessages.FAILURE.ACCESS_DENIED);
    }

    // ToDo: change blacklist to deletion
    if (foundRefreshToken.blacklisted) {
      this.logger.error(`Refresh token blacklisted ${foundRefreshToken.token}, for user ${userId}`);
      throw new UnauthorizedException(AuthMessages.FAILURE.ACCESS_DENIED);
    }

    const decryptedRefreshToken = this.encryptor.decrypt(foundRefreshToken.token);

    if (refreshToken !== decryptedRefreshToken) {
      this.logger.error("Decrypted refresh token doesn't match token supplied");
      throw new UnauthorizedException(AuthMessages.FAILURE.ACCESS_DENIED);
    }

    await this.jwtAuthService.verifyRefreshToken(refreshToken);

    const tokens = await this.generateTokens(userId);
    return RefreshTokenResult.from(tokens, {
      status: HttpStatus.OK,
      message: AuthMessages.SUCCESS.TOKENS_REFRESHED,
    });
  }

  private async generateTokens(userId: string): Promise<AuthTokens> {
    const user = await this.userService.findById(userId);
    if (!user) {
      this.logger.error(`User with id: ${userId} not found`);
      throw new BadRequestException(AuthMessages.FAILURE.ACCESS_DENIED);
    }

    const tokens = await this.jwtAuthService.getTokens({
      id: userId,
      email: user.email,
      type: user.type,
    });

    await this.saveRefreshToken({
      token: tokens.refreshToken,
      userId,
    });

    return tokens;
  }

  public async saveRefreshToken(input: { token: string; userId: string }) {
    const { userId, token } = input;
    const expires = new Date(Date.now() + this._getRefreshTokenExpiry());
    await this.save({
      token,
      userId,
      expires,
      type: TokenTypes.REFRESH_TOKEN,
    });
  }

  async save(input: { token: string; userId: string; expires: Date; type: TokenTypes }) {
    const { token, userId, expires, type } = input;
    const existingToken = await this.tokensRepository.find({
      where: { userId, type: type as UserTokenType },
    });

    if (existingToken) {
      await this.tokensRepository.update({
        where: { id: existingToken.id },
        data: {
          token,
          expires,
          blacklisted: false,
        },
      });
    } else {
      await this.tokensRepository.create({
        data: { token, user: { connect: { id: userId } }, expires, type: type as UserTokenType },
      });
    }
  }

  find(userId: string, type: TokenTypes) {
    return this.tokensRepository.find({ where: { userId, type: type as UserTokenType } });
  }

  async blacklistToken(userId: string, type: TokenTypes): Promise<void> {
    const existingToken = await this.tokensRepository.find({
      where: { userId, type: type as UserTokenType },
    });
    await this.tokensRepository.update({
      where: { id: existingToken.id },
      data: { blacklisted: true },
    });
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const refreshToken = await this.tokensRepository.find({
      where: { token },
    });
    return refreshToken?.blacklisted ?? false;
  }

  private _getRefreshTokenExpiry(): number {
    const refreshTokenAge = this.configService.get<string>('jwt.refreshTokenAge');
    const unit = refreshTokenAge.slice(-1);
    const value = parseInt(refreshTokenAge.slice(0, -1), 10);

    if (isNaN(value)) {
      throw new Error('Invalid refresh token age format');
    }

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        // Assuming it's in milliseconds if no unit
        const defaultValue = parseInt(refreshTokenAge, 10);
        if (isNaN(defaultValue)) {
          throw new Error('Invalid refresh token age format');
        }
        return defaultValue;
    }
  }
}
