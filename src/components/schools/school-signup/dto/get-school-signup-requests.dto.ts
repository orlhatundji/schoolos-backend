import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { SchoolSignupStatus } from '@prisma/client';

export class GetSchoolSignupRequestsDto {
  @ApiPropertyOptional({
    description: 'Filter by signup request status',
    enum: SchoolSignupStatus,
    example: 'PENDING',
  })
  @IsOptional()
  @IsEnum(SchoolSignupStatus)
  @Transform(({ value }) => value?.toUpperCase())
  status?: SchoolSignupStatus;

  @ApiPropertyOptional({
    description: 'Number of records to return',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number;
} 