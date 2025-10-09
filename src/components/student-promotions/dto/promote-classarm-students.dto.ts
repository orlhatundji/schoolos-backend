import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional, IsArray, IsEnum } from 'class-validator';

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
}
