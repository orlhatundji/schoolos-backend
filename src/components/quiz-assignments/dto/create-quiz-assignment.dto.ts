import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { QuizDeliveryMode } from '@prisma/client';

export class CreateQuizAssignmentDto {
  @ApiProperty({ description: 'Quiz to assign — must be PUBLISHED and visible to caller' })
  @IsUUID()
  quizId: string;

  @ApiProperty({ description: 'classArmSubjectId — caller must teach this' })
  @IsUUID()
  classArmSubjectId: string;

  @ApiProperty()
  @IsUUID()
  termId: string;

  @ApiProperty({ enum: QuizDeliveryMode })
  @IsEnum(QuizDeliveryMode)
  mode: QuizDeliveryMode;

  @ApiProperty({ description: 'ISO date-time when students can begin' })
  @IsDateString()
  windowOpensAt: string;

  @ApiProperty({ description: 'ISO date-time when window closes' })
  @IsDateString()
  windowClosesAt: string;

  @ApiProperty({ description: 'Per-student timer in minutes', minimum: 1, maximum: 600 })
  @IsInt()
  @Min(1)
  @Max(600)
  durationMinutes: number;

  @ApiProperty({
    required: false,
    default: 60,
    description: 'SYNC_START only — late-joiner grace period in seconds',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(900)
  syncGracePeriodSeconds?: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxAttempts?: number;

  @ApiProperty({
    required: false,
    description:
      'Override Quiz.defaultSettings.showResultsImmediately for this assignment. If false, teacher must call /release-results.',
  })
  @IsOptional()
  @IsBoolean()
  showResultsImmediately?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showCorrectAnswers?: boolean;
}
