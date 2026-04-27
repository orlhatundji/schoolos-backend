import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AggregationMethod, MissingAttemptPolicy } from '@prisma/client';

import { AggregationItemDto } from './create-aggregation.dto';

/**
 * Only allowed while status is DRAFT. classArmSubjectId, termId, and
 * assessmentTemplateEntryId cannot be changed — delete and recreate
 * if the target slot needs to change.
 */
export class UpdateAggregationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false, enum: AggregationMethod })
  @IsOptional()
  @IsEnum(AggregationMethod)
  aggregationMethod?: AggregationMethod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  bestOfN?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  rescaleToMaxScore?: number;

  @ApiProperty({ required: false, enum: MissingAttemptPolicy })
  @IsOptional()
  @IsEnum(MissingAttemptPolicy)
  missingAttemptPolicy?: MissingAttemptPolicy;

  @ApiProperty({
    required: false,
    type: [AggregationItemDto],
    description: 'When provided, replaces the items list wholesale',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AggregationItemDto)
  items?: AggregationItemDto[];
}
