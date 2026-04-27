import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreatePopularExamDto {
  @ApiProperty({
    description: 'Stable machine code for the exam (uppercase, used in tagging). Cannot be changed after creation.',
    example: 'WAEC',
  })
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'code must be UPPER_SNAKE_CASE starting with a letter',
  })
  @MaxLength(40)
  code: string;

  @ApiProperty({
    description: 'Full display name of the exam',
    example: 'West African Examinations Council',
  })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'ISO country code or region (e.g. NG, INTL)',
    example: 'NG',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  country?: string;

  @ApiProperty({
    description: 'Free-text description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Whether this exam is selectable by teachers (defaults to true)',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
