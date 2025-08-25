import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { SubjectCategory } from '@prisma/client';

export class CreateSubjectDto {
  @ApiProperty({
    description: 'Subject name',
    example: 'Mathematics',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Department ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiProperty({
    description: 'Subject category',
    enum: SubjectCategory,
    example: SubjectCategory.CORE,
    default: SubjectCategory.CORE,
  })
  @IsEnum(SubjectCategory)
  @IsOptional()
  category?: SubjectCategory;
}
