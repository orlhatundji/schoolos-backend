import { ApiProperty } from '@nestjs/swagger';
import { BaseResult, ResultOptions } from '../../../../../common/results';

export class ResetPasswordByAdminResult extends BaseResult {
  @ApiProperty()
  defaultPassword: string;

  static from(options: ResultOptions, defaultPassword: string): ResetPasswordByAdminResult {
    const result = new ResetPasswordByAdminResult(options.status, options.message);
    result.defaultPassword = defaultPassword;

    return result;
  }
}
