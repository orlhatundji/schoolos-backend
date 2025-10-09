import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PromotionRuleDto {
  @ApiProperty({
    description: 'Type of promotion rule',
    enum: ['AUTOMATIC', 'MANUAL', 'REPEAT', 'GRADUATION', 'TRANSFER'],
    example: 'AUTOMATIC'
  })
  @IsString()
  @IsNotEmpty()
  promotionType: string;

  @ApiProperty({
    description: 'Whether to create missing class arms automatically',
    example: true
  })
  @IsBoolean()
  createMissingClassArms: boolean;

  @ApiProperty({
    description: 'Maximum class capacity',
    example: 30
  })
  @IsOptional()
  maxClassCapacity?: number;

  @ApiProperty({
    description: 'Whether to maintain student groupings',
    example: true
  })
  @IsBoolean()
  maintainGroupings: boolean;

  @ApiProperty({
    description: 'Notes for this promotion batch',
    example: 'End of year promotion to next academic session'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePromotionBatchDto {
  @ApiProperty({
    description: 'Target academic session ID for promotion',
    example: 'uuid-string'
  })
  @IsUUID()
  @IsNotEmpty()
  toAcademicSessionId: string;

  @ApiProperty({
    description: 'Promotion rules configuration',
    type: PromotionRuleDto
  })
  @ValidateNested()
  @Type(() => PromotionRuleDto)
  promotionRules: PromotionRuleDto;

  @ApiProperty({
    description: 'Array of student IDs to promote (optional - if not provided, all active students will be promoted)',
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentIds?: string[];

  @ApiProperty({
    description: 'Whether to skip students with failed validations',
    example: false
  })
  @IsBoolean()
  skipFailedStudents: boolean = false;
}
