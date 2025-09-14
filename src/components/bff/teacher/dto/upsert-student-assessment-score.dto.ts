import { IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize, IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertStudentAssessmentScoreItemDto {
  @ApiProperty({
    description: 'ID of the assessment score to update (optional - if not provided, will create new)',
    example: 'assessment-score-uuid',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  id?: string;

  @ApiProperty({
    description: 'Student ID (required for new scores, ignored for updates)',
    example: 'student-uuid',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  studentId?: string;

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
    description: 'Whether this is an exam (optional - will be auto-determined from assessment structure if not provided)',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isExam?: boolean;
}

export class UpsertStudentAssessmentScoreDto {
  @ApiProperty({
    description: 'Subject name (required for new scores)',
    example: 'Mathematics',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  subjectName?: string;

  @ApiProperty({
    description: 'Term name (required for new scores)',
    example: 'First Term',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  termName?: string;

  @ApiProperty({
    description: 'Assessment name (required for new scores)',
    example: 'Test 1',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  assessmentName?: string;

  @ApiProperty({
    description: 'Array of student assessment scores to create or update',
    type: [UpsertStudentAssessmentScoreItemDto],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one assessment score is required' })
  @ArrayMaxSize(100, { message: 'Cannot process more than 100 assessment scores at once' })
  @ValidateNested({ each: true })
  @Type(() => UpsertStudentAssessmentScoreItemDto)
  assessmentScores: UpsertStudentAssessmentScoreItemDto[];
}
