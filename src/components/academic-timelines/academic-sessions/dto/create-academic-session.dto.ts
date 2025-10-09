import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsNotEmpty,
  Matches,
  IsString,
  IsUUID,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CreateTermForSessionDto } from './create-term-for-session.dto';

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
    description: 'Array of terms to create for this academic session',
    type: [CreateTermForSessionDto],
    example: [
      {
        name: 'First Term',
        startDate: '2024-09-01T00:00:00.000Z',
        endDate: '2024-12-15T00:00:00.000Z',
      },
      {
        name: 'Second Term',
        startDate: '2025-01-15T00:00:00.000Z',
        endDate: '2025-04-15T00:00:00.000Z',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTermForSessionDto)
  @IsNotEmpty()
  terms: CreateTermForSessionDto[];

}
