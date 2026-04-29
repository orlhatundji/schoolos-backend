import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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
import { QuestionDifficulty, QuizStatus } from '@prisma/client';

import { QuizDefaultSettingsDto } from './quiz-default-settings.dto';

export class CreateQuizDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Long-form student instructions shown before the quiz' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({
    required: false,
    description: 'School-scoped subject id. Required for TEACHER_AUTHORED, must be null for SCHOS_CURATED.',
  })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiProperty({
    required: false,
    description: 'School-scoped level id. Required for TEACHER_AUTHORED, must be null for SCHOS_CURATED.',
  })
  @IsOptional()
  @IsUUID()
  levelId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  defaultTermId?: string;

  @ApiProperty({
    required: false,
    description:
      'Canonical subject name. Required for SCHOS_CURATED. Auto-derived from subject.name on create for TEACHER_AUTHORED if not provided.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  canonicalSubjectName?: string;

  @ApiProperty({
    required: false,
    description:
      'Canonical level code. Required for SCHOS_CURATED. Auto-derived from level.code on create for TEACHER_AUTHORED if not provided.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  canonicalLevelCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  canonicalTermName?: string;

  @ApiProperty({ required: false, enum: QuizStatus, default: QuizStatus.DRAFT })
  @IsOptional()
  @IsEnum(QuizStatus)
  status?: QuizStatus;

  @ApiProperty({ required: false, description: 'Estimated duration in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  estimatedMinutes?: number;

  @ApiProperty({ required: false, description: 'Pass mark as a percentage (0-100)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  passMarkPercent?: number;

  @ApiProperty({ required: false, enum: QuestionDifficulty })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;

  @ApiProperty({ required: false, type: QuizDefaultSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuizDefaultSettingsDto)
  defaultSettings?: QuizDefaultSettingsDto;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Topic ids to tag this quiz with',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  topicIds?: string[];
}
