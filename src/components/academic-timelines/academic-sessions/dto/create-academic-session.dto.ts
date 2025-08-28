import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsNotEmpty,
  Matches,
  IsString,
  IsUUID,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAcademicSessionDto {
  @ApiProperty({
    example: '2024-2025',
    description: 'Academic year in YYYY-YYYY format.',
  })
  @Matches(/^\d{4}-\d{4}$/, {
    message: 'Academic year must be in the format YYYY-YYYY (e.g., 2024-2025)',
  })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiProperty({
    example: '2024-08-01T00:00:00.000Z',
    description: 'Start date of the academic session.',
  })
  @Transform(({ value }) => new Date(value))
  @IsDate()
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({
    example: '2025-06-30T00:00:00.000Z',
    description: 'End date of the academic session.',
  })
  @Transform(({ value }) => new Date(value))
  @IsDate()
  @IsNotEmpty()
  endDate: Date;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Flag to indicate if this is the current academic session.',
  })
  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;


}
