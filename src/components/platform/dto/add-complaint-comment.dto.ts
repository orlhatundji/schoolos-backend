import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddComplaintCommentDto {
  @ApiProperty({ description: 'Comment content' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Whether this is an internal comment', required: false })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
