import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class GeneratePaymentsDto {
  @ApiProperty({ description: 'Academic session ID', required: false })
  @IsOptional()
  @IsString()
  academicSessionId?: string;

  @ApiProperty({ description: 'Term ID', required: false })
  @IsOptional()
  @IsString()
  termId?: string;

  @ApiProperty({ description: 'Level ID — generate for all students in this level', required: false })
  @IsOptional()
  @IsString()
  levelId?: string;

  @ApiProperty({
    description: 'Class arm IDs — generate for students in these specific class arms. If empty and levelId is set, targets all class arms in that level.',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  classArmIds?: string[];
}
