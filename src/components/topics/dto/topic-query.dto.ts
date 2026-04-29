import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class TopicQueryDto {
  @ApiProperty({ required: false, description: 'Filter to topics for this subject (case-insensitive)' })
  @IsOptional()
  @IsString()
  canonicalSubjectName?: string;

  @ApiProperty({ required: false, description: 'Filter to topics for this level code' })
  @IsOptional()
  @IsString()
  canonicalLevelCode?: string;

  @ApiProperty({
    required: false,
    description: 'Filter to direct children of this topic. Pass an id, or "root" to get top-level topics only.',
  })
  @IsOptional()
  @IsString()
  parentTopicId?: string;

  @ApiProperty({ required: false, description: 'Free-text search on name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, default: false, description: 'If true, also include soft-deleted topics' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeDeleted?: boolean;
}
