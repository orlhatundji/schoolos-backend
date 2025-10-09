import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsBoolean, IsOptional, IsInt, Min } from 'class-validator';

export class CreateLevelProgressionDto {
  @ApiProperty({
    description: 'Source level ID',
    example: 'uuid-string'
  })
  @IsUUID()
  @IsNotEmpty()
  fromLevelId: string;

  @ApiProperty({
    description: 'Target level ID',
    example: 'uuid-string'
  })
  @IsUUID()
  @IsNotEmpty()
  toLevelId: string;

  @ApiProperty({
    description: 'Whether this progression is automatic',
    example: true
  })
  @IsBoolean()
  isAutomatic: boolean = true;

  @ApiProperty({
    description: 'Whether this progression requires approval',
    example: false
  })
  @IsBoolean()
  requiresApproval: boolean = false;

  @ApiProperty({
    description: 'Order of progression (for sorting)',
    example: 1
  })
  @IsInt()
  @Min(0)
  order: number = 0;
}

export class UpdateLevelProgressionDto {
  @ApiProperty({
    description: 'Whether this progression is automatic',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isAutomatic?: boolean;

  @ApiProperty({
    description: 'Whether this progression requires approval',
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiProperty({
    description: 'Order of progression (for sorting)',
    example: 1,
    required: false
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
