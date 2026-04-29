import { ApiProperty } from '@nestjs/swagger';

import type { AssessmentsUsageView } from '../../../quiz-billing/quiz-billing.service';

export class AssessmentsUsageByAssignmentResult {
  @ApiProperty()
  quizAssignmentId!: string;

  @ApiProperty()
  attempts!: number;

  @ApiProperty()
  units!: number;

  @ApiProperty({ description: 'Nominal cost in kobo at full rate' })
  nominalAmountKobo!: number;
}

export class AssessmentsUsageResult implements AssessmentsUsageView {
  @ApiProperty({ example: '2026-04', description: 'Month aggregated, in YYYY-MM' })
  month!: string;

  @ApiProperty()
  totalAttempts!: number;

  @ApiProperty()
  totalUnits!: number;

  @ApiProperty({ description: 'Sum of nominal cost in kobo (full rate)' })
  nominalAmountKobo!: number;

  @ApiProperty({
    description: 'Portion of the nominal that is waived this month (Beta or first-year free)',
  })
  waivedAmountKobo!: number;

  @ApiProperty({ description: 'Portion of the nominal actually billable for this month' })
  chargeableAmountKobo!: number;

  @ApiProperty({ type: [AssessmentsUsageByAssignmentResult] })
  byAssignment!: AssessmentsUsageByAssignmentResult[];

  constructor(data: AssessmentsUsageView) {
    Object.assign(this, data);
  }
}
