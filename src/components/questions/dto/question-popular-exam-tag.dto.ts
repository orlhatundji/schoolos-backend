import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class QuestionPopularExamTagDto {
  @ApiProperty({ description: 'PopularExam id (resolved from /popular-exams)' })
  @IsUUID()
  popularExamId: string;

  @ApiProperty({
    required: false,
    description: 'Year the question was drawn from (e.g. 2019)',
    minimum: 1900,
    maximum: 2100,
  })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  examYear?: number;

  @ApiProperty({
    required: false,
    description: 'Free-text paper / question reference (e.g. "Paper 2 Q14")',
  })
  @IsOptional()
  @IsString()
  paperReference?: string;
}
