import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { QuizAssignmentStatus, QuizDeliveryMode } from '@prisma/client';

export class QuizAssignmentQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  classArmSubjectId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  termId?: string;

  @ApiProperty({ required: false, enum: QuizAssignmentStatus })
  @IsOptional()
  @IsEnum(QuizAssignmentStatus)
  status?: QuizAssignmentStatus;

  @ApiProperty({ required: false, enum: QuizDeliveryMode })
  @IsOptional()
  @IsEnum(QuizDeliveryMode)
  mode?: QuizDeliveryMode;

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
