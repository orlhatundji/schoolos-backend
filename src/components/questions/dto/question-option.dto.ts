import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class QuestionOptionDto {
  @ApiProperty({ description: 'Display order (0-based) among options' })
  @IsInt()
  @Min(0)
  order: number;

  @ApiProperty({
    description: 'Option label as TipTap JSON (supports inline math + images)',
  })
  @IsObject()
  label: Record<string, unknown>;

  @ApiProperty({ description: 'Plain-text rendering of label, used for search/preview' })
  @IsString()
  labelPlainText: string;

  @ApiProperty({ description: 'Whether selecting this option counts as correct' })
  @IsBoolean()
  isCorrect: boolean;

  @ApiProperty({ required: false, description: 'Optional S3 key for an option image' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}
