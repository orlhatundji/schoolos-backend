import { ApiProperty } from '@nestjs/swagger';
import {
  AggregationMethod,
  MissingAttemptPolicy,
  QuizAggregationStatus,
  QuizScoreAggregation,
  QuizScoreAggregationItem,
} from '@prisma/client';

type AggregationWithRelations = QuizScoreAggregation & {
  items: (QuizScoreAggregationItem & {
    quizAssignment: {
      id: string;
      quiz: { id: string; title: string };
      windowOpensAt: Date;
    };
  })[];
};

export class AggregationItemResult {
  @ApiProperty() id: string;
  @ApiProperty() quizAssignmentId: string;
  @ApiProperty() quizTitle: string;
  @ApiProperty() windowOpensAt: Date;
  @ApiProperty({ description: 'Decimal as string' }) weight: string;

  constructor(item: AggregationWithRelations['items'][number]) {
    this.id = item.id;
    this.quizAssignmentId = item.quizAssignmentId;
    this.quizTitle = item.quizAssignment.quiz.title;
    this.windowOpensAt = item.quizAssignment.windowOpensAt;
    this.weight = item.weight.toString();
  }
}

export class AggregationResult {
  @ApiProperty() id: string;
  @ApiProperty() schoolId: string;
  @ApiProperty() classArmSubjectId: string;
  @ApiProperty() termId: string;
  @ApiProperty() assessmentTemplateEntryId: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: AggregationMethod }) aggregationMethod: AggregationMethod;
  @ApiProperty({ required: false, nullable: true }) bestOfN: number | null;
  @ApiProperty() rescaleToMaxScore: number;
  @ApiProperty({ enum: MissingAttemptPolicy }) missingAttemptPolicy: MissingAttemptPolicy;
  @ApiProperty({ enum: QuizAggregationStatus }) status: QuizAggregationStatus;
  @ApiProperty({ required: false, nullable: true }) finalizedAt: Date | null;
  @ApiProperty({ required: false, nullable: true }) finalizedByTeacherId: string | null;
  @ApiProperty({ type: [AggregationItemResult] }) items: AggregationItemResult[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(a: AggregationWithRelations) {
    this.id = a.id;
    this.schoolId = a.schoolId;
    this.classArmSubjectId = a.classArmSubjectId;
    this.termId = a.termId;
    this.assessmentTemplateEntryId = a.assessmentTemplateEntryId;
    this.name = a.name;
    this.aggregationMethod = a.aggregationMethod;
    this.bestOfN = a.bestOfN;
    this.rescaleToMaxScore = a.rescaleToMaxScore;
    this.missingAttemptPolicy = a.missingAttemptPolicy;
    this.status = a.status;
    this.finalizedAt = a.finalizedAt;
    this.finalizedByTeacherId = a.finalizedByTeacherId;
    this.items = a.items.map((i) => new AggregationItemResult(i));
    this.createdAt = a.createdAt;
    this.updatedAt = a.updatedAt;
  }
}

export class AggregationsListResult {
  @ApiProperty({ type: [AggregationResult] }) items: AggregationResult[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;

  constructor(items: AggregationResult[], total: number, page: number, limit: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
  }
}

export class CreateAggregationResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty({ type: AggregationResult }) aggregation: AggregationResult;

  constructor(aggregation: AggregationResult) {
    this.success = true;
    this.message = 'Aggregation created';
    this.aggregation = aggregation;
  }
}

export class UpdateAggregationResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty({ type: AggregationResult }) aggregation: AggregationResult;

  constructor(aggregation: AggregationResult) {
    this.success = true;
    this.message = 'Aggregation updated';
    this.aggregation = aggregation;
  }
}

export class DeleteAggregationResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  constructor() {
    this.success = true;
    this.message = 'Aggregation deleted';
  }
}

// ---- Preview ----

export class AggregationItemPreviewResult {
  @ApiProperty() quizAssignmentId: string;
  @ApiProperty() quizTitle: string;
  @ApiProperty({ required: false, nullable: true }) percentage: number | null;
  @ApiProperty({ description: 'true if the student has no GRADED attempt for this item' })
  missing: boolean;

  constructor(quizAssignmentId: string, quizTitle: string, percentage: number | null, missing: boolean) {
    this.quizAssignmentId = quizAssignmentId;
    this.quizTitle = quizTitle;
    this.percentage = percentage;
    this.missing = missing;
  }
}

export class StudentPreviewRowResult {
  @ApiProperty() studentId: string;
  @ApiProperty() studentNo: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty({ type: [AggregationItemPreviewResult] }) items: AggregationItemPreviewResult[];
  @ApiProperty({ description: 'Aggregated percentage in [0, 100]' })
  computedPercentage: number;
  @ApiProperty({ description: 'Computed percentage * rescaleToMaxScore / 100, rounded' })
  rescaledScore: number;
}

export class AggregationPreviewResult {
  @ApiProperty({ type: AggregationResult }) aggregation: AggregationResult;
  @ApiProperty({ type: [StudentPreviewRowResult] }) rows: StudentPreviewRowResult[];

  constructor(aggregation: AggregationResult, rows: StudentPreviewRowResult[]) {
    this.aggregation = aggregation;
    this.rows = rows;
  }
}

export class FinalizeAggregationResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty() upsertedRows: number;
  @ApiProperty() finalizedAt: Date;

  constructor(upsertedRows: number, finalizedAt: Date) {
    this.success = true;
    this.message = `Aggregation finalized: ${upsertedRows} student score(s) written to gradebook`;
    this.upsertedRows = upsertedRows;
    this.finalizedAt = finalizedAt;
  }
}
