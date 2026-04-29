import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { QuizOverrideType } from '@prisma/client';

export class GrantOverrideDto {
  @ApiProperty({ description: 'Student receiving the override' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ enum: QuizOverrideType })
  @IsEnum(QuizOverrideType)
  type: QuizOverrideType;

  @ApiProperty({
    required: false,
    description: 'RETRY only — number of additional attempts to grant (must be >= 1)',
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  extraAttempts?: number;

  @ApiProperty({
    required: false,
    description: 'EXTRA_TIME only — additional minutes added to the student\'s dueAt',
    minimum: 1,
    maximum: 600,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  extraMinutes?: number;

  @ApiProperty({
    required: false,
    description: 'EXTEND_WINDOW only — new windowClosesAt for this student',
  })
  @IsOptional()
  @IsDateString()
  newWindowClosesAt?: string;

  @ApiProperty({
    description: 'Why this override was granted (required, audit trail)',
    minLength: 3,
    maxLength: 500,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string;
}
