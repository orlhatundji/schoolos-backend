import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsBoolean, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentDetailDto } from './assessment-detail.dto';

export class CreateAssessmentStructureTemplateDto {
  @ApiProperty({
    description: 'Academic session ID this template belongs to',
    example: 'uuid-string',
  })
  @IsString()
  academicSessionId: string;

  @ApiProperty({
    description: 'Template name (e.g., "Standard Assessment Structure")',
    example: 'Standard Assessment Structure',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Optional description of the template',
    example: 'Standard assessment structure for all subjects',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Array of assessment details',
    type: [AssessmentDetailDto],
    example: [
      { name: 'Test 1', description: 'First test', maxScore: 20, isExam: false, order: 1 },
      { name: 'Test 2', description: 'Second test', maxScore: 20, isExam: false, order: 2 },
      { name: 'Exam', description: 'Final exam', maxScore: 60, isExam: true, order: 3 }
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one assessment is required' })
  @ValidateNested({ each: true })
  @Type(() => AssessmentDetailDto)
  assessments: AssessmentDetailDto[];
}

export class UpdateAssessmentStructureTemplateDto {
  @ApiProperty({
    description: 'Template name',
    example: 'Updated Assessment Structure',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Optional description of the template',
    example: 'Updated assessment structure',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Array of assessment details',
    type: [AssessmentDetailDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentDetailDto)
  assessments?: AssessmentDetailDto[];
}

export class AssessmentStructureTemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  schoolId: string;

  @ApiProperty()
  academicSessionId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  assessments: AssessmentDetailDto[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isGlobalDefault: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
