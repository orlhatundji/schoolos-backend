import { IsString, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CommentTemplateType } from '@prisma/client';

export class CreateCommentTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;

  @ApiProperty({ enum: CommentTemplateType })
  @IsEnum(CommentTemplateType)
  type: CommentTemplateType;
}
