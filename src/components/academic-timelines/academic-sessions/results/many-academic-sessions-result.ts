import { ApiProperty } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { BaseResultWithData } from '../../../../common/results';
import { AcademicSession } from '../types';
import { AcademicSessionEntity } from './academic-session-result';

export class ManyAcademicSessionsResult extends BaseResultWithData<AcademicSessionEntity[]> {
  @ApiProperty({ type: () => [AcademicSessionEntity] })
  public data: AcademicSessionEntity[];

  public static from(
    sessions: AcademicSession[],
    options: { message: string; status: HttpStatus },
  ): ManyAcademicSessionsResult {
    const academicSessionEntities = AcademicSessionEntity.fromArray(sessions);
    return new ManyAcademicSessionsResult(options.status, options.message, academicSessionEntities);
  }
}
