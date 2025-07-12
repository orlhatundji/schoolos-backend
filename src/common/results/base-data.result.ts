import { HttpStatus } from '@nestjs/common';
import { BaseResult } from './base.result';

export class BaseResultWithData<T = unknown> extends BaseResult {
  public data?: T | T[];

  constructor(
    status: HttpStatus,
    message: string,
    data?: T,
    total?: number,
    limit?: number,
    currentPage?: number,
  ) {
    super(status, message, total, limit, currentPage);
    this.data = data;
  }
}
