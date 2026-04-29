import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class QuizQuestionOrderDto {
  @ApiProperty()
  @IsUUID()
  questionId: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  order: number;
}

export class ReorderQuestionsDto {
  @ApiProperty({
    type: [QuizQuestionOrderDto],
    description:
      'Full new ordering. Must include EVERY currently-attached question; partial reorders are rejected.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionOrderDto)
  orderings: QuizQuestionOrderDto[];
}
