import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

/**
 * `slug`, `canonicalSubjectName`, and `canonicalLevelCode` are intentionally
 * omitted — they are part of the topic's identity. To re-tag, archive and
 * recreate.
 */
export class UpdateTopicDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Move to a different parent (or null to make root)' })
  @IsOptional()
  @IsUUID()
  parentTopicId?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
