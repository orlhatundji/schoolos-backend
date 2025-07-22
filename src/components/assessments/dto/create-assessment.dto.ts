import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAssessmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @ApiProperty({ example: 'Mid-term Exam' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'This is the mid term examination',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 40 })
  @IsNumber()
  @Min(1)
  @Max(100)
  maxScore: number;
}
