import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListEquationsDto {
  @ApiPropertyOptional({
    description: 'Filter by canonical subject slug, e.g. "mathematics" or "physics".',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  subjectSlug?: string;

  @ApiPropertyOptional({
    description: 'Free-text search against equation name and tags.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  q?: string;
}
