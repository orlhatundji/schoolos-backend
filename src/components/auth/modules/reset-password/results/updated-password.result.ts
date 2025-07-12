import { BaseResult, ResultOptions } from '../../../../../common/results';

export class UpdatePasswordResult extends BaseResult {
  static from(options: ResultOptions): UpdatePasswordResult {
    const result = new UpdatePasswordResult(options.status, options.message);
    return result;
  }
}
