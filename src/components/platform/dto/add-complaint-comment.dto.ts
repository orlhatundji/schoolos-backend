import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AddComplaintCommentDto {
  @ApiProperty({ description: 'Body of the comment' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;

  @ApiPropertyOptional({
    description:
      'If true the comment is only visible to platform admins; defaults to false (visible to reporter).',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean = false;
}
