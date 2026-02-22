import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { TokensService } from './tokens.service';
import {
  GetCurrentUser,
  GetCurrentUserId,
  IsGuardedByRefreshToken,
} from '../../../../common/decorators';
import { AuthMessages } from '../../results';
import { RefreshTokenResult } from './results';
import { RefreshTokenGuard } from '../../strategies/jwt/guards';
import { StrategyEnum } from '../../strategies';

@Controller('tokens')
@ApiTags('Refresh Tokens')
@IsGuardedByRefreshToken()
@UseGuards(RefreshTokenGuard)
@ApiBearerAuth(StrategyEnum.JWT_REFRESH)
export class RefershTokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    type: RefreshTokenResult,
    description: AuthMessages.SUCCESS.TOKENS_REFRESHED,
  })
  @ApiUnauthorizedResponse({
    description: AuthMessages.FAILURE.ACCESS_DENIED,
  })
  async refreshToken(
    @GetCurrentUserId() userId: string,
    @GetCurrentUser('refreshToken') refreshToken: string,
  ) {
    return this.tokensService.refreshToken(userId, refreshToken);
  }
}
