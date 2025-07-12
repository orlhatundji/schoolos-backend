import { ApiProperty } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { BaseResultWithData } from '../../../common/results';
import { AssessmentStructure, AssessmentComponent } from '@prisma/client';

export class AssessmentComponentEntity implements AssessmentComponent {
  @ApiProperty() id: string;
  @ApiProperty() assessmentStructureId: string;
  @ApiProperty() name: string;
  @ApiProperty() weight: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty() deletedAt: Date | null;

  public static from(component: AssessmentComponent): AssessmentComponentEntity {
    return Object.assign(new AssessmentComponentEntity(), component);
  }

  public static fromArray(components: AssessmentComponent[]): AssessmentComponentEntity[] {
    return components.map((c) => this.from(c));
  }
}

export class AssessmentStructureEntity implements AssessmentStructure {
  @ApiProperty() id: string;
  @ApiProperty() schoolId: string;
  @ApiProperty() academicSessionId: string;
  @ApiProperty() name: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty() deletedAt: Date | null;
  @ApiProperty({ type: () => [AssessmentComponentEntity] })
  components: AssessmentComponentEntity[];

  public static from(
    structure: AssessmentStructure & { components?: AssessmentComponent[] },
  ): AssessmentStructureEntity {
    const entity = Object.assign(new AssessmentStructureEntity(), structure);
    entity.components = structure.components
      ? AssessmentComponentEntity.fromArray(structure.components)
      : [];
    return entity;
  }

  public static fromArray(
    structures: (AssessmentStructure & { components?: AssessmentComponent[] })[],
  ): AssessmentStructureEntity[] {
    return structures.map((s) => this.from(s));
  }
}

export class AssessmentStructureResult extends BaseResultWithData<AssessmentStructureEntity> {
  @ApiProperty({ type: () => AssessmentStructureEntity })
  public data: AssessmentStructureEntity;

  public static from(
    structure: AssessmentStructure & { components?: AssessmentComponent[] },
    options: { message: string; status: HttpStatus },
  ): AssessmentStructureResult {
    const entity = AssessmentStructureEntity.from(structure);
    return new AssessmentStructureResult(options.status, options.message, entity);
  }
}

export class ManyAssessmentStructuresResult extends BaseResultWithData<
  AssessmentStructureEntity[]
> {
  @ApiProperty({ type: () => [AssessmentStructureEntity] })
  public data: AssessmentStructureEntity[];

  public static from(
    structures: (AssessmentStructure & { components?: AssessmentComponent[] })[],
    options: { message: string; status: HttpStatus },
  ): ManyAssessmentStructuresResult {
    const entities = AssessmentStructureEntity.fromArray(structures);
    return new ManyAssessmentStructuresResult(options.status, options.message, entities);
  }
}
