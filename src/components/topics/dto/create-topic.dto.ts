import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTopicDto {
  @ApiProperty({
    description: 'Display name (e.g. "Newton\'s Laws of Motion")',
    example: "Newton's Laws of Motion",
  })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Globally-unique URL slug. Lowercase letters, digits, hyphens.',
    example: 'physics-ss2-newtons-laws',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase, alphanumeric with hyphens (e.g. my-topic-name)',
  })
  @MaxLength(120)
  slug: string;

  @ApiProperty({
    description: 'Canonical subject name (case-insensitive matched against School.Subject.name)',
    example: 'Physics',
  })
  @IsString()
  @MaxLength(100)
  canonicalSubjectName: string;

  @ApiProperty({
    description: 'Canonical level code matched against School.Level.code',
    example: 'SS2',
  })
  @IsString()
  @MaxLength(20)
  canonicalLevelCode: string;

  @ApiProperty({ required: false, description: 'Parent topic id for subtopics' })
  @IsOptional()
  @IsUUID()
  parentTopicId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, default: 0, description: 'Display order among siblings' })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
