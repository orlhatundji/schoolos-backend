import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class AssessmentDetailDto {
  @ApiProperty({
    description: 'Name of the assessment (e.g., "Test 1", "Midterm Exam")',
    example: 'Test 1',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Description of the assessment',
    example: 'First continuous assessment test',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Maximum score as percentage (1-100)',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  maxScore: number;

  @ApiProperty({
    description: 'Whether this is an exam or regular assessment',
    example: false,
  })
  @IsBoolean()
  isExam: boolean;

  @ApiProperty({
    description: 'Display order for UI',
    example: 1,
  })
  @IsNumber()
  order: number;
}
