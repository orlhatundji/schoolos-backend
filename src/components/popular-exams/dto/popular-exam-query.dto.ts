import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class PopularExamQueryDto {
  @ApiProperty({
    description: 'Filter by active status. Omit to return all (active and inactive).',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    description: 'Filter by country code (e.g. NG, INTL)',
    required: false,
  })
  @IsOptional()
  @IsString()
  country?: string;
}
