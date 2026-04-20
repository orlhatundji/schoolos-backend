import { ApiPropertyOptional } from '@nestjs/swagger';
import { SchoolDeletionRequestStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class DeletionRequestsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: SchoolDeletionRequestStatus })
  @IsOptional()
  @IsEnum(SchoolDeletionRequestStatus)
  status?: SchoolDeletionRequestStatus;
}
