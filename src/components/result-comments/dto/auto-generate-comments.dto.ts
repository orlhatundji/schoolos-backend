import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AutoGeneratePrincipalCommentsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classArmId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termId?: string;

  @ApiPropertyOptional({ description: 'If true, overwrite existing principal comments' })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
