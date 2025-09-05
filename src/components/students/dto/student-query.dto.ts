import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { StudentStatus } from '@prisma/client';

export class StudentQueryDto {
  @ApiProperty({ required: false, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, description: 'Items per page', maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    required: false,
    description: 'Search term for student name, email, or student ID',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Filter by level ID' })
  @IsOptional()
  @IsUUID()
  levelId?: string;

  @ApiProperty({ required: false, description: 'Filter by class arm ID' })
  @IsOptional()
  @IsUUID()
  classArmId?: string;

  @ApiProperty({ required: false, enum: StudentStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiProperty({ required: false, enum: ['MALE', 'FEMALE'], description: 'Filter by gender' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ required: false, description: 'Minimum age filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ageMin?: number;

  @ApiProperty({ required: false, description: 'Maximum age filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ageMax?: number;

  @ApiProperty({
    required: false,
    description: 'Sort field',
    enum: ['name', 'age', 'level', 'studentId', 'status', 'createdAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({ required: false, description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiProperty({ required: false, description: 'Filter by school ID' })
  @IsOptional()
  @IsUUID()
  schoolId?: string;
}
