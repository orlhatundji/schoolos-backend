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
import { QuestionDifficulty } from '@prisma/client';

import { QuizDefaultSettingsDto } from '../../../quizzes/dto';

export class ImportWordQuestionsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  levelId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  defaultTermId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  canonicalSubjectName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  canonicalLevelCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  canonicalTermName?: string;

  @ApiProperty({ required: false, enum: QuestionDifficulty })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  topicIds?: string[];
}

export class ImportWordQuizDto extends ImportWordQuestionsDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  @Type(() => Number)
  estimatedMinutes?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @Type(() => Number)
  passMarkPercent?: number;

  @ApiProperty({ required: false, type: QuizDefaultSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuizDefaultSettingsDto)
  defaultSettings?: QuizDefaultSettingsDto;
}

export class ImportWordQuizFormDto extends ImportWordQuizDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;
}

export class ImportWordQuestionsFormDto extends ImportWordQuestionsDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;
}

export function parseImportWordQuizForm(body: Record<string, unknown>): ImportWordQuizDto {
  return parseImportWordForm(body) as ImportWordQuizDto;
}

export function parseImportWordQuestionsForm(body: Record<string, unknown>): ImportWordQuestionsDto {
  return parseImportWordForm(body) as ImportWordQuestionsDto;
}

function parseImportWordForm(body: Record<string, unknown>) {
  const parsed: Record<string, unknown> = { ...body };

  if (typeof parsed.topicIds === 'string') {
    parsed.topicIds = splitList(parsed.topicIds);
  }
  if (typeof parsed.defaultSettings === 'string' && parsed.defaultSettings.length > 0) {
    parsed.defaultSettings = JSON.parse(parsed.defaultSettings);
  }
  if (typeof parsed.estimatedMinutes === 'string' && parsed.estimatedMinutes.length > 0) {
    parsed.estimatedMinutes = Number(parsed.estimatedMinutes);
  }
  if (typeof parsed.passMarkPercent === 'string' && parsed.passMarkPercent.length > 0) {
    parsed.passMarkPercent = Number(parsed.passMarkPercent);
  }

  return parsed as unknown;
}

function splitList(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) return JSON.parse(trimmed);
  return trimmed
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}
