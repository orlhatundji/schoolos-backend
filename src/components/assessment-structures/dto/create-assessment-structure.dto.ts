import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateAssessmentStructureDto {
  @ApiProperty({
    description: 'Name of the assessment structure (e.g., "Test 1", "Test 2", "Exam")',
    example: 'Test 1',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Optional description of the assessment structure',
    example: 'First continuous assessment test',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Maximum score for this assessment type (must total 100 across all types)',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  maxScore: number;

  @ApiProperty({
    description: 'Whether this is an exam or regular assessment',
    example: false,
    default: false,
  })
  @IsBoolean()
  isExam: boolean;

  @ApiProperty({
    description: 'Display order for UI',
    example: 1,
  })
  @IsInt()
  @Min(1)
  order: number;
}
