import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';

export class PromoteStudentDto {
  @ApiProperty({
    description: 'Student ID to promote',
    example: 'uuid-string'
  })
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({
    description: 'Target class arm ID for promotion',
    example: 'uuid-string'
  })
  @IsUUID()
  @IsNotEmpty()
  toClassArmId: string;

  @ApiProperty({
    description: 'Type of promotion',
    enum: ['AUTOMATIC', 'MANUAL', 'REPEAT', 'GRADUATION', 'TRANSFER'],
    example: 'AUTOMATIC'
  })
  @IsEnum(['AUTOMATIC', 'MANUAL', 'REPEAT', 'GRADUATION', 'TRANSFER'])
  promotionType: string;

  @ApiProperty({
    description: 'Notes for this promotion',
    example: 'Promoted to next level based on academic performance',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
