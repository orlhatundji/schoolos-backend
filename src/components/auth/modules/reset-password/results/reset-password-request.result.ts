import { BaseResult, ResultOptions } from '../../../../../common/results';

export class ResetPasswordRequestResult extends BaseResult {
  static from(options: ResultOptions): ResetPasswordRequestResult {
    const result = new ResetPasswordRequestResult(options.status, options.message);

    return result;
  }
}
