import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTermForSessionDto {
  @ApiProperty({
    example: 'First Term',
    description: 'Name of the term (e.g., First Term, Second Term, Third Term)',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '2024-09-01T00:00:00.000Z',
    description: 'Start date of the term',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    example: '2024-12-15T00:00:00.000Z',
    description: 'End date of the term',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
