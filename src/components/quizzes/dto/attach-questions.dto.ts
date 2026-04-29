import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class QuizQuestionAttachmentDto {
  @ApiProperty()
  @IsUUID()
  questionId: string;

  @ApiProperty({
    required: false,
    description: 'Display order. If omitted, appended after the current last order.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiProperty({
    required: false,
    description: 'Per-quiz weight override. If null/undefined, uses Question.weight.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999.99)
  weightOverride?: number;
}

export class AttachQuestionsDto {
  @ApiProperty({ type: [QuizQuestionAttachmentDto], description: 'Questions to attach (preserves order)' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionAttachmentDto)
  questions: QuizQuestionAttachmentDto[];
}
