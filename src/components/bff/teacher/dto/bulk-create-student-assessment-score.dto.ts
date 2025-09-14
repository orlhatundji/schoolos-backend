import { IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateStudentAssessmentScoreDto } from './create-student-assessment-score.dto';

export class BulkCreateStudentAssessmentScoreDto {
  @ApiProperty({
    description: 'Array of student assessment scores to create',
    type: [CreateStudentAssessmentScoreDto],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one assessment score is required' })
  @ArrayMaxSize(100, { message: 'Cannot create more than 100 assessment scores at once' })
  @ValidateNested({ each: true })
  @Type(() => CreateStudentAssessmentScoreDto)
  assessmentScores: CreateStudentAssessmentScoreDto[];
}
