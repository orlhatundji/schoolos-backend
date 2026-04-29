import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AggregationMethod, MissingAttemptPolicy } from '@prisma/client';

export class AggregationItemDto {
  @ApiProperty()
  @IsUUID()
  quizAssignmentId: string;

  @ApiProperty({ required: false, default: 1, description: 'Used by WEIGHTED method' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999.99)
  weight?: number;
}

export class CreateAggregationDto {
  @ApiProperty()
  @IsUUID()
  classArmSubjectId: string;

  @ApiProperty()
  @IsUUID()
  termId: string;

  @ApiProperty({
    description:
      'UUID of the entry inside AssessmentStructureTemplate.assessments JSON to write into',
  })
  @IsUUID()
  assessmentTemplateEntryId: string;

  @ApiProperty({ description: "Internal label for this aggregation (not the slot's name)" })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: AggregationMethod })
  @IsEnum(AggregationMethod)
  aggregationMethod: AggregationMethod;

  @ApiProperty({
    required: false,
    description: 'Required for BEST_OF_N. Clamped to the number of items at compute time.',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  bestOfN?: number;

  @ApiProperty({
    description:
      "Final maxScore to rescale to — should match the assessment slot's maxScore. Stored explicitly so historical aggregations stay accurate even if the slot is later edited.",
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Max(1000)
  rescaleToMaxScore: number;

  @ApiProperty({
    required: false,
    enum: MissingAttemptPolicy,
    default: MissingAttemptPolicy.TREAT_AS_ZERO,
  })
  @IsOptional()
  @IsEnum(MissingAttemptPolicy)
  missingAttemptPolicy?: MissingAttemptPolicy;

  @ApiProperty({ type: [AggregationItemDto], description: 'Quizzes to aggregate' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AggregationItemDto)
  items: AggregationItemDto[];
}
