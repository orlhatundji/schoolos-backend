import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsObject,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class ResponseEntryDto {
  @ApiProperty()
  @IsUUID()
  questionId: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      "Per-type response shape. MCQ_SINGLE: { selectedOptionId }. MCQ_MULTI: { selectedOptionIds: string[] }. TRUE_FALSE: { value: boolean }. NUMERIC: { value: number, unit?: string }. SHORT_ANSWER: { text: string }. Pass null to clear an answer.",
  })
  @IsOptional()
  @IsObject()
  responseJson: Record<string, unknown> | null;
}

export class SaveResponsesDto {
  @ApiProperty({
    type: [ResponseEntryDto],
    description: 'One or more response updates. Server upserts in a transaction.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ResponseEntryDto)
  responses: ResponseEntryDto[];
}
