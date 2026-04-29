import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListSymbolsDto {
  @ApiPropertyOptional({ description: 'Filter by category, e.g. GREEK_LOWER, OPERATORS, FUNCTIONS' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @ApiPropertyOptional({ description: 'Free-text search across symbol name and tags' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  q?: string;
}
