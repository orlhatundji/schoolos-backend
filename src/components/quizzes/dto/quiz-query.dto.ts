import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { QuestionDifficulty, QuizStatus } from '@prisma/client';

export class QuizQueryDto {
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
  @IsString()
  canonicalSubjectName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  canonicalLevelCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  canonicalTermName?: string;

  @ApiProperty({ required: false, type: [String], description: 'Filter to quizzes tagged with ANY of these topic ids' })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsUUID('4', { each: true })
  topicIds?: string[];

  @ApiProperty({ required: false, enum: QuestionDifficulty })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;

  @ApiProperty({ required: false, enum: QuizStatus })
  @IsOptional()
  @IsEnum(QuizStatus)
  status?: QuizStatus;

  @ApiProperty({ required: false, description: 'Free-text search on title (case-insensitive contains)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
