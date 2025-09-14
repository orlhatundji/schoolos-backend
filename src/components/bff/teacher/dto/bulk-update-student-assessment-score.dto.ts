import { IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize, IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BulkUpdateStudentAssessmentScoreItemDto {
  @ApiProperty({
    description: 'ID of the assessment score to update',
    example: 'assessment-score-uuid',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Score for the assessment',
    example: 85,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @ApiProperty({
    description: 'Name of the assessment',
    example: 'Test 1',
    required: false,
  })
  @IsOptional()
  @IsString()
  assessmentName?: string;
}

export class BulkUpdateStudentAssessmentScoreDto {
  @ApiProperty({
    description: 'Array of student assessment scores to update',
    type: [BulkUpdateStudentAssessmentScoreItemDto],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one assessment score is required' })
  @ArrayMaxSize(100, { message: 'Cannot update more than 100 assessment scores at once' })
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateStudentAssessmentScoreItemDto)
  assessmentScores: BulkUpdateStudentAssessmentScoreItemDto[];
}
