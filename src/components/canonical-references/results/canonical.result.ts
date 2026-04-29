import { ApiProperty } from '@nestjs/swagger';
import { CanonicalLevel, CanonicalSubject, CanonicalTerm } from '@prisma/client';

export class CanonicalSubjectResult {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty({ required: false, nullable: true }) description: string | null;
  @ApiProperty() active: boolean;

  constructor(s: CanonicalSubject) {
    this.id = s.id;
    this.name = s.name;
    this.slug = s.slug;
    this.description = s.description;
    this.active = s.active;
  }
}

export class CanonicalSubjectsListResult {
  @ApiProperty({ type: [CanonicalSubjectResult] })
  subjects: CanonicalSubjectResult[];

  constructor(subjects: CanonicalSubjectResult[]) {
    this.subjects = subjects;
  }
}

export class CanonicalLevelResult {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty({
    description: 'Cluster (PRIMARY, JUNIOR_SECONDARY, SENIOR_SECONDARY, INTL_GRADE, BRITISH, etc.)',
  })
  group: string;
  @ApiProperty() order: number;
  @ApiProperty() active: boolean;

  constructor(l: CanonicalLevel) {
    this.id = l.id;
    this.code = l.code;
    this.name = l.name;
    this.group = l.group;
    this.order = l.order;
    this.active = l.active;
  }
}

export class CanonicalLevelsListResult {
  @ApiProperty({ type: [CanonicalLevelResult] })
  levels: CanonicalLevelResult[];

  constructor(levels: CanonicalLevelResult[]) {
    this.levels = levels;
  }
}

export class CanonicalTermResult {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() order: number;
  @ApiProperty() active: boolean;

  constructor(t: CanonicalTerm) {
    this.id = t.id;
    this.name = t.name;
    this.order = t.order;
    this.active = t.active;
  }
}

export class CanonicalTermsListResult {
  @ApiProperty({ type: [CanonicalTermResult] })
  terms: CanonicalTermResult[];

  constructor(terms: CanonicalTermResult[]) {
    this.terms = terms;
  }
}
