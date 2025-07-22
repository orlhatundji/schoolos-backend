import { ApiProperty } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { BaseResultWithData } from '../../../common/results';
import { Assessment } from '@prisma/client';

export class AssessmentEntity implements Assessment {
  @ApiProperty() id: string;
  @ApiProperty() schoolId: string;
  @ApiProperty() name: string;
  @ApiProperty() description: string | null;
  @ApiProperty() maxScore: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty() deletedAt: Date | null;

  public static from(assessment: Assessment): AssessmentEntity {
    return Object.assign(new AssessmentEntity(), assessment);
  }

  public static fromArray(assessments: Assessment[]): AssessmentEntity[] {
    return assessments.map((a) => this.from(a));
  }
}

export class AssessmentResult extends BaseResultWithData<AssessmentEntity> {
  @ApiProperty({ type: () => AssessmentEntity })
  public data: AssessmentEntity;

  public static from(
    assessment: Assessment,
    options: { message: string; status: HttpStatus },
  ): AssessmentResult {
    const entity = AssessmentEntity.from(assessment);
    return new AssessmentResult(options.status, options.message, entity);
  }
}

export class ManyAssessmentsResult extends BaseResultWithData<AssessmentEntity[]> {
  @ApiProperty({ type: () => [AssessmentEntity] })
  public data: AssessmentEntity[];

  public static from(
    assessments: Assessment[],
    options: { message: string; status: HttpStatus },
  ): ManyAssessmentsResult {
    const entities = AssessmentEntity.fromArray(assessments);
    return new ManyAssessmentsResult(options.status, options.message, entities);
  }
}
