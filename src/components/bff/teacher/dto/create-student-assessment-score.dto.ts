import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max, IsNotEmpty } from 'class-validator';

export class CreateStudentAssessmentScoreDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  subjectName: string;

  @IsString()
  @IsNotEmpty()
  termName: string;

  @IsString()
  @IsNotEmpty()
  assessmentName: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @IsOptional()
  @IsBoolean()
  isExam?: boolean;
}
