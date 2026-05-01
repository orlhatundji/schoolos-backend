import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export class StudentRecordDto {
  @ApiProperty({
    description: 'Student first name',
    example: 'John',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'Student last name',
    example: 'Doe',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Student gender',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({
    description: 'Class arm ID (UUID) - Legacy field, use className instead',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  classArmId?: string;

  @ApiProperty({
    description: 'Class name (e.g., "Grade 1 A", "JSS 1 Blue") - Preferred over classArmId',
    example: 'Grade 1 A',
    required: false,
  })
  @IsOptional()
  @IsString()
  className?: string;

  @ApiProperty({
    description: 'Student date of birth (YYYY-MM-DD)',
    example: '2012-05-15',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    description: 'Student email address',
    example: 'john.doe@school.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Student phone number',
    example: '+234-XXX-XXX-XXXX',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'State of origin',
    example: 'Lagos',
    required: false,
  })
  @IsOptional()
  @IsString()
  stateOfOrigin?: string;

  @ApiProperty({
    description: 'Custom admission number',
    example: 'ADM001',
    required: false,
  })
  @IsOptional()
  @IsString()
  admissionNo?: string;

  @ApiProperty({
    description: 'Admission date (YYYY-MM-DD)',
    example: '2025-09-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  admissionDate?: string;

  @ApiProperty({
    description: 'Guardian first name',
    example: 'Jane',
    required: false,
  })
  @IsOptional()
  @IsString()
  guardianFirstName?: string;

  @ApiProperty({
    description: 'Guardian last name',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  guardianLastName?: string;

  @ApiProperty({
    description: 'Guardian email address',
    example: 'jane.doe@email.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  guardianEmail?: string;

  @ApiProperty({
    description: 'Guardian phone number',
    example: '+234-XXX-XXX-XXXX',
    required: false,
  })
  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @ApiProperty({
    description: 'Guardian relationship to student',
    example: 'Mother',
    required: false,
  })
  @IsOptional()
  @IsString()
  guardianRelationship?: string;

  // --- Address (optional) ---
  @ApiProperty({ description: 'Address line 1', example: '12 Marina Road', required: false })
  @IsOptional()
  @IsString()
  addressStreet1?: string;

  @ApiProperty({ description: 'Address line 2', example: 'Apt 4B', required: false })
  @IsOptional()
  @IsString()
  addressStreet2?: string;

  @ApiProperty({ description: 'City', example: 'Lagos', required: false })
  @IsOptional()
  @IsString()
  addressCity?: string;

  @ApiProperty({ description: 'State / region', example: 'Lagos', required: false })
  @IsOptional()
  @IsString()
  addressState?: string;

  @ApiProperty({ description: 'Country', example: 'Nigeria', required: false })
  @IsOptional()
  @IsString()
  addressCountry?: string;

  @ApiProperty({ description: 'Postal / ZIP code', example: '101241', required: false })
  @IsOptional()
  @IsString()
  addressPostalCode?: string;

  // --- Medical (optional) ---
  @ApiProperty({ description: 'Blood group', example: 'O+', required: false })
  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @ApiProperty({
    description: 'Allergies, semicolon-separated',
    example: 'peanuts;penicillin',
    required: false,
  })
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiProperty({
    description: 'Medical conditions, semicolon-separated',
    example: 'asthma;eczema',
    required: false,
  })
  @IsOptional()
  @IsString()
  medicalConditions?: string;

  @ApiProperty({ description: 'Emergency contact name', example: 'Jane Doe', required: false })
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiProperty({
    description: 'Emergency contact phone',
    example: '+234-XXX-XXX-XXXX',
    required: false,
  })
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiProperty({
    description: 'Emergency contact relationship to student',
    example: 'Mother',
    required: false,
  })
  @IsOptional()
  @IsString()
  emergencyContactRelationship?: string;
}
