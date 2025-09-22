import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { Gender, TeacherStatus, EmploymentType } from '@prisma/client';

export class QueryTeachersDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search term for teacher name, email, or teacher ID' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by state of origin' })
  @IsString()
  @IsOptional()
  stateOfOrigin?: string;

  @ApiPropertyOptional({ description: 'Filter by assigned class' })
  @IsUUID()
  @IsOptional()
  assignedClassId?: string;

  @ApiPropertyOptional({ description: 'Filter by gender' })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ description: 'Filter by teacher status' })
  @IsEnum(TeacherStatus)
  @IsOptional()
  status?: TeacherStatus;

  @ApiPropertyOptional({ description: 'Filter by employment type' })
  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ description: 'Filter by academic session' })
  @IsUUID()
  @IsOptional()
  academicSessionId?: string;

  @ApiPropertyOptional({ description: 'Filter by department' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by subject' })
  @IsUUID()
  @IsOptional()
  subjectId?: string;
}
