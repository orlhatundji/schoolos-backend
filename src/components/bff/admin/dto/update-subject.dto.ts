import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateSubjectDto {
  @ApiProperty({
    description: 'Subject name',
    example: 'Advanced Mathematics',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Department ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiProperty({
    description: 'Category ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;
}
