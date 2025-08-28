import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class UpdateSubjectDto {
  @ApiProperty({
    description: 'Name of the subject',
    example: 'Mathematics',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Category of the subject',
    example: 'CORE',
    enum: ['CORE', 'GENERAL', 'VOCATIONAL'],
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'ID of the department this subject belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  departmentId?: string;
}
