import { ApiProperty } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { BaseResultWithData } from '../../../../common/results';
import { AcademicSession } from '../types';

export class AcademicSessionEntity implements AcademicSession {
  @ApiProperty()
  id: string;

  @ApiProperty()
  schoolId: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  isCurrent: boolean;

  @ApiProperty()
  academicYear: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  deletedAt: Date | null;

  public static from(academicSession: AcademicSession): AcademicSessionEntity {
    return Object.assign(new AcademicSessionEntity(), academicSession);
  }

  public static fromArray(sessions: AcademicSession[]): AcademicSessionEntity[] {
    return sessions.map((academicSession) => this.from(academicSession));
  }
}

export class AcademicSessionResult extends BaseResultWithData<AcademicSessionEntity> {
  @ApiProperty({ type: () => AcademicSessionEntity })
  public data: AcademicSessionEntity;

  public static from(
    academicSession: AcademicSession,
    options: { message: string; status: HttpStatus },
  ): AcademicSessionResult {
    const sessionEntity = AcademicSessionEntity.from(academicSession);
    return new AcademicSessionResult(options.status, options.message, sessionEntity);
  }
}
