import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

/**
 * Edits are only allowed while the assignment is still in SCHEDULED state
 * (now < windowOpensAt). quizId, classArmSubjectId, and termId cannot be
 * changed — cancel and re-create instead.
 */
export class UpdateQuizAssignmentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  windowOpensAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  windowClosesAt?: string;

  @ApiProperty({ required: false, minimum: 1, maximum: 600 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  durationMinutes?: number;

  @ApiProperty({ required: false, minimum: 0, maximum: 900 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(900)
  syncGracePeriodSeconds?: number;

  @ApiProperty({ required: false, minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxAttempts?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showResultsImmediately?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showCorrectAnswers?: boolean;
}
