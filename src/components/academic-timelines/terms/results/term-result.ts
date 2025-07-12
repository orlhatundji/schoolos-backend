import { ApiProperty } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { BaseResultWithData } from '../../../../common/results';
import { Term } from '../types';

export class TermEntity implements Term {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  academicSessionId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  deletedAt: Date | null;

  public static from(term: Term): TermEntity {
    return Object.assign(new TermEntity(), term);
  }

  public static fromArray(terms: Term[]): TermEntity[] {
    return terms.map((term) => this.from(term));
  }
}

export class TermResult extends BaseResultWithData<TermEntity> {
  @ApiProperty({ type: () => TermEntity })
  public data: TermEntity;

  public static from(term: Term, options: { message: string; status: HttpStatus }): TermResult {
    const termEntity = TermEntity.from(term);

    return new TermResult(options.status, options.message, termEntity);
  }
}
