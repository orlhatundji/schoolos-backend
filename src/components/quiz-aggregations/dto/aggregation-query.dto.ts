import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { QuizAggregationStatus } from '@prisma/client';

export class AggregationQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  classArmSubjectId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  termId?: string;

  @ApiProperty({ required: false, enum: QuizAggregationStatus })
  @IsOptional()
  @IsEnum(QuizAggregationStatus)
  status?: QuizAggregationStatus;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
