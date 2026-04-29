import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { AssessmentsSettingsView } from '../../../quiz-billing/quiz-billing.service';

export class AssessmentsSettingsResult implements AssessmentsSettingsView {
  @ApiProperty({ description: 'Whether Assessments is currently enabled for this school' })
  assessmentsEnabled!: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  assessmentsEnabledAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, description: 'Display name of the admin who enabled it' })
  assessmentsEnabledByName!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description:
      'Date until which usage is waived (max of global Beta cutoff and school.createdAt + 365d)',
  })
  freeUntil!: Date;

  @ApiPropertyOptional({
    nullable: true,
    enum: ['BETA', 'FIRST_YEAR'],
    description: 'Reason for the active waiver, or null if no waiver currently applies',
  })
  freeUntilReason!: 'BETA' | 'FIRST_YEAR' | null;

  @ApiProperty({ description: 'Rate per chargeable unit, in naira' })
  unitRateNaira!: number;

  constructor(data: AssessmentsSettingsView) {
    Object.assign(this, data);
  }
}
