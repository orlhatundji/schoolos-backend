import { ApiProperty } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { BaseResultWithData } from '../../../../common/results';
import { Term } from '../types';
import { TermEntity } from './term-result';

export class ManyTermsResult extends BaseResultWithData<TermEntity[]> {
  @ApiProperty({ type: () => [TermEntity] })
  public data: TermEntity[];

  public static from(
    terms: Term[],
    options: { message: string; status: HttpStatus },
  ): ManyTermsResult {
    const termEntities = TermEntity.fromArray(terms);
    return new ManyTermsResult(options.status, options.message, termEntities);
  }
}
