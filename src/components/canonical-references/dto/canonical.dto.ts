import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCanonicalSubjectDto {
  @ApiProperty({ example: 'Astronomy' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    required: false,
    example: 'astronomy',
    description: 'URL slug. Lowercase alphanumeric with hyphens. Auto-generated from name if omitted.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric with hyphens (e.g. my-subject-name)',
  })
  @MaxLength(100)
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateCanonicalSubjectDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric with hyphens',
  })
  @MaxLength(100)
  slug?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateCanonicalLevelDto {
  @ApiProperty({
    example: 'GRADE_13',
    description: 'Stable code, UPPER_SNAKE_CASE. Cannot collide with an existing level.',
  })
  @IsString()
  @MaxLength(40)
  code: string;

  @ApiProperty({ example: 'Grade 13' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'INTL_GRADE',
    description: 'Group bucket: PRIMARY | JUNIOR_SECONDARY | SENIOR_SECONDARY | INTL_GRADE | BRITISH | (custom)',
  })
  @IsString()
  @MaxLength(40)
  group: string;

  @ApiProperty({ example: 13, description: 'Display order within the group' })
  @IsInt()
  @Min(0)
  order: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateCanonicalLevelDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  group?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateCanonicalTermDto {
  @ApiProperty({ example: 'Fourth Term' })
  @IsString()
  @MaxLength(60)
  name: string;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(0)
  order: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateCanonicalTermDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
