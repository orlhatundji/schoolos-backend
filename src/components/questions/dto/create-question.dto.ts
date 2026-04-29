import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  PartialCreditMode,
  QuestionDifficulty,
  QuestionStatus,
  QuestionType,
} from '@prisma/client';

import { QuestionOptionDto } from './question-option.dto';
import { QuestionPopularExamTagDto } from './question-popular-exam-tag.dto';

export class CreateQuestionDto {
  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({
    description: 'Question prompt as TipTap JSON document (supports inline LaTeX math).',
  })
  @IsObject()
  prompt: Record<string, unknown>;

  @ApiProperty({ description: 'Plain-text rendering of prompt, used for search/preview' })
  @IsString()
  promptPlainText: string;

  @ApiProperty({ required: false, type: [String], description: 'S3 keys for prompt media' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @ApiProperty({
    required: false,
    description: 'Explanation shown after grading (TipTap JSON)',
  })
  @IsOptional()
  @IsObject()
  explanation?: Record<string, unknown>;

  @ApiProperty({
    required: false,
    description: 'Base weight (default 1.0). Overridable per quiz via QuizQuestion.weightOverride.',
    default: 1,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999.99)
  weight?: number;

  @ApiProperty({ required: false, enum: QuestionDifficulty })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;

  @ApiProperty({ required: false, enum: QuestionStatus, default: QuestionStatus.DRAFT })
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

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

  @ApiProperty({ required: false, description: 'Default term id (school-scoped)' })
  @IsOptional()
  @IsUUID()
  defaultTermId?: string;

  @ApiProperty({
    required: false,
    description:
      'Canonical subject name (e.g. "Mathematics"). Required for SCHOS_CURATED. Auto-derived from subject.name on create for TEACHER_AUTHORED if not provided.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  canonicalSubjectName?: string;

  @ApiProperty({
    required: false,
    description:
      'Canonical level code (e.g. "SS2"). Required for SCHOS_CURATED. Auto-derived from level.code on create for TEACHER_AUTHORED if not provided.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  canonicalLevelCode?: string;

  @ApiProperty({
    required: false,
    description:
      'Canonical term name (e.g. "First Term"). Optional. Auto-derived from term.name on create for TEACHER_AUTHORED if not provided.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  canonicalTermName?: string;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Topic ids to tag this question with',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  topicIds?: string[];

  @ApiProperty({
    required: false,
    type: [QuestionPopularExamTagDto],
    description: 'Past-exam sources (one entry per exam+year)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionPopularExamTagDto)
  popularExams?: QuestionPopularExamTagDto[];

  @ApiProperty({
    required: false,
    type: [QuestionOptionDto],
    description: 'Options (required for MCQ_SINGLE / MCQ_MULTI; ignored for other types)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  @ApiProperty({
    required: false,
    description:
      'Type-specific config. NUMERIC: { correctAnswer, tolerance, unit?, toleranceMode }. SHORT_ANSWER: { acceptedAnswers, caseSensitive, normalizeWhitespace }. TRUE_FALSE: { correctAnswer }.',
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiProperty({ required: false, enum: PartialCreditMode })
  @IsOptional()
  @IsEnum(PartialCreditMode)
  partialCreditMode?: PartialCreditMode;
}
