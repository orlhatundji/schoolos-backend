import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsEnum, IsDateString, IsUUID, IsArray } from 'class-validator';
import { Gender, TeacherStatus, EmploymentType } from '@prisma/client';

export class CreateTeacherDto {
  @ApiProperty({ description: 'First name of the teacher' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name of the teacher' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Teacher ID (auto-generated if not provided)' })
  @IsString()
  @IsOptional()
  teacherId?: string;

  @ApiProperty({ description: 'Email address of the teacher' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Phone number of the teacher' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Password for the teacher account' })
  @IsString()
  password: string;

  @ApiProperty({ description: 'Gender of the teacher' })
  @IsEnum(Gender)
  gender: Gender;

  @ApiPropertyOptional({ description: 'State of origin' })
  @IsString()
  @IsOptional()
  stateOfOrigin?: string;

  @ApiPropertyOptional({ description: 'Date of birth' })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Address ID' })
  @IsUUID()
  @IsOptional()
  addressId?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Teacher status' })
  @IsEnum(TeacherStatus)
  @IsOptional()
  status?: TeacherStatus;

  @ApiPropertyOptional({ description: 'Employment type' })
  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ description: 'Educational qualification' })
  @IsString()
  @IsOptional()
  qualification?: string;

  @ApiPropertyOptional({ description: 'Join date' })
  @IsDateString()
  @IsOptional()
  joinDate?: string;

  @ApiPropertyOptional({ description: 'Subject IDs to assign to teacher' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  subjectIds?: string[];

  @ApiPropertyOptional({ description: 'Class arm ID to assign as class teacher' })
  @IsUUID()
  @IsOptional()
  classArmId?: string;
}
