import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum AnalyticsRange {
  D30 = '30d',
  D90 = '90d',
  M12 = '12m',
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: AnalyticsRange,
    default: AnalyticsRange.D90,
    description:
      'Time range for series endpoints. 30d/90d use daily buckets; 12m uses monthly.',
  })
  @IsOptional()
  @IsEnum(AnalyticsRange)
  range?: AnalyticsRange = AnalyticsRange.D90;
}
