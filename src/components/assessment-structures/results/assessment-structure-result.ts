import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { AssessmentStructure } from '@prisma/client';

import { BaseResultWithData } from '../../../common/results';

export class AssessmentStructureEntity implements AssessmentStructure {
  @ApiProperty() id: string;
  @ApiProperty() schoolId: string;
  @ApiProperty() academicSessionId: string;
  @ApiProperty() name: string;
  @ApiProperty() description: string | null;
  @ApiProperty() maxScore: number;
  @ApiProperty() isExam: boolean;
  @ApiProperty() order: number;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty() deletedAt: Date | null;

  public static from(assessmentStructure: AssessmentStructure): AssessmentStructureEntity {
    return Object.assign(new AssessmentStructureEntity(), assessmentStructure);
  }

  public static fromArray(
    assessmentStructures: AssessmentStructure[],
  ): AssessmentStructureEntity[] {
    return assessmentStructures.map((a) => this.from(a));
  }
}

export class AssessmentStructureResult extends BaseResultWithData<AssessmentStructureEntity> {
  @ApiProperty({ type: () => AssessmentStructureEntity })
  public data: AssessmentStructureEntity;

  public static from(
    assessmentStructure: AssessmentStructure,
    options: { message: string; status: HttpStatus },
  ): AssessmentStructureResult {
    const entity = AssessmentStructureEntity.from(assessmentStructure);
    return new AssessmentStructureResult(options.status, options.message, entity);
  }
}

export class ManyAssessmentStructuresResult extends BaseResultWithData<
  AssessmentStructureEntity[]
> {
  @ApiProperty({ type: () => [AssessmentStructureEntity] })
  public data: AssessmentStructureEntity[];

  public static from(
    assessmentStructures: AssessmentStructure[],
    options: { message: string; status: HttpStatus },
  ): ManyAssessmentStructuresResult {
    const entities = AssessmentStructureEntity.fromArray(assessmentStructures);
    return new ManyAssessmentStructuresResult(options.status, options.message, entities);
  }
}
