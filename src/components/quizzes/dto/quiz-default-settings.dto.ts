import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Quiz-level defaults. A QuizAssignment can override `showResultsImmediately`
 * and `showCorrectAnswers` per assignment.
 */
export class QuizDefaultSettingsDto {
  @ApiProperty({ required: false, description: 'Shuffle question order on each attempt' })
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @ApiProperty({ required: false, description: 'Shuffle MCQ option order on each attempt' })
  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @ApiProperty({
    required: false,
    description: 'Show results to students immediately on submit (overridable per assignment)',
  })
  @IsOptional()
  @IsBoolean()
  showResultsImmediately?: boolean;

  @ApiProperty({ required: false, description: 'Let students review their submitted attempt' })
  @IsOptional()
  @IsBoolean()
  allowReview?: boolean;

  @ApiProperty({
    required: false,
    description: 'Reveal correct answers in the review (only relevant if allowReview)',
  })
  @IsOptional()
  @IsBoolean()
  showCorrectAnswers?: boolean;
}
