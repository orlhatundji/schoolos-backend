import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class UpdateStudentAssessmentScoreDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @IsOptional()
  @IsString()
  assessmentName?: string;
}
