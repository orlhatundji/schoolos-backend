import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ManualGradeResponseDto {
  @ApiProperty({ description: 'Points awarded for this response. Must not exceed response weight.' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pointsAwarded: number;

  @ApiProperty({ required: false, nullable: true, description: 'Teacher feedback for the student.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  teacherFeedback?: string;
}
