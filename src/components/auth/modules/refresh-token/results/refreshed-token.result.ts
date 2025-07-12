import { ApiProperty } from '@nestjs/swagger';
import { BaseResultWithData, ResultOptions } from '../../../../../common/results';
import { AuthTokens } from '../../../../auth/strategies/jwt/types';

class TokenData {
  tokens: AuthTokens;
}

export class RefreshTokenResult extends BaseResultWithData {
  @ApiProperty({ type: () => TokenData })
  public data: TokenData;

  public static from(tokens: AuthTokens, options: ResultOptions) {
    const res = new RefreshTokenResult(options.status, options.message, {
      tokens,
    });

    return res;
  }
}
