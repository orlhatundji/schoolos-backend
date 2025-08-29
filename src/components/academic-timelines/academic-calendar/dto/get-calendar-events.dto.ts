import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetCalendarEventsDto {
  @ApiProperty({
    description: 'Academic session ID to filter events',
    example: 'uuid',
    required: false,
  })
  @IsString()
  @IsOptional()
  academicSessionId?: string;

  @ApiProperty({
    description: 'Start date for date range filter (YYYY-MM-DD)',
    example: '2024-09-01',
    required: false,
  })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'End date for date range filter (YYYY-MM-DD)',
    example: '2024-12-31',
    required: false,
  })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    description: 'Month for filtering (1-12)',
    example: 9,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  @IsOptional()
  month?: number;

  @ApiProperty({
    description: 'Year for filtering',
    example: 2024,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  year?: number;

  @ApiProperty({
    description: 'Term ID to filter events by term',
    example: 'uuid',
    required: false,
  })
  @IsString()
  @IsOptional()
  termId?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    default: 20,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
