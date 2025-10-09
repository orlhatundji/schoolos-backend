import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional, IsArray, IsEnum, IsBoolean } from 'class-validator';

export enum PromotionType {
  PROMOTE = 'PROMOTE',
  REPEAT = 'REPEAT',
}

export class PromoteClassArmStudentsDto {
  @ApiProperty({
    description: 'ID of the source class arm',
    example: 'class-arm-uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  fromClassArmId: string;

  @ApiProperty({
    description: 'ID of the target academic session',
    example: 'session-uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  toAcademicSessionId: string;

  @ApiProperty({
    description: 'ID of the target level',
    example: 'level-uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  toLevelId: string;

  @ApiProperty({
    description: 'Type of promotion',
    enum: PromotionType,
    example: PromotionType.PROMOTE,
  })
  @IsEnum(PromotionType)
  promotionType: PromotionType;

  @ApiProperty({
    description: 'Optional array of specific student IDs to promote. If not provided, all students in the class arm will be promoted.',
    required: false,
    example: ['student-uuid-1', 'student-uuid-2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  studentIds?: string[];

  @ApiProperty({
    description: 'Optional notes for the promotion',
    required: false,
    example: 'End of academic year promotion',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Custom name for the target class arm (optional override for automatic name)',
    required: false,
    example: 'B',
  })
  @IsOptional()
  @IsString()
  targetClassArmName?: string;

  @ApiProperty({
    description: 'Whether to use an existing class arm instead of creating a new one',
    required: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  useExistingClassArm?: boolean;

  @ApiProperty({
    description: 'ID of existing target class arm (required if useExistingClassArm is true)',
    required: false,
    example: 'class-arm-uuid',
  })
  @IsOptional()
  @IsString()
  existingTargetClassArmId?: string;

  @ApiProperty({
    description: 'ID of class arm for repeaters (required for REPEAT type)',
    required: false,
    example: 'class-arm-uuid',
  })
  @IsOptional()
  @IsString()
  repeatersClassArmId?: string;

  @ApiProperty({
    description: 'Name for new repeaters class arm (optional, for creating new repeaters class arm)',
    required: false,
    example: 'Repeaters',
  })
  @IsOptional()
  @IsString()
  repeatersClassArmName?: string;
}
