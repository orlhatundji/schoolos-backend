import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSchoolAddressDto {
  @ApiProperty({ description: 'Street address line 1', required: false })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiProperty({ description: 'Street address line 2', required: false })
  @IsOptional()
  @IsString()
  street2?: string;

  @ApiProperty({ description: 'City', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ description: 'State', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ description: 'Country', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ description: 'Postal code', required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;
}

export class UpdateContactInfoDto {
  @ApiProperty({ description: 'Phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Email address', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: 'Website URL', required: false })
  @IsOptional()
  @IsString()
  website?: string;
}

export class UpdateAcademicSettingsDto {
  @ApiProperty({ description: 'Grading system', enum: ['PERCENTAGE', 'LETTER_GRADE', 'POINTS'], required: false })
  @IsOptional()
  @IsString()
  gradingSystem?: string;

  @ApiProperty({ description: 'Pass mark percentage', required: false })
  @IsOptional()
  @IsNumber()
  passMark?: number;

  @ApiProperty({ description: 'Maximum score', required: false })
  @IsOptional()
  @IsNumber()
  maxScore?: number;

  @ApiProperty({ description: 'Attendance threshold percentage', required: false })
  @IsOptional()
  @IsNumber()
  attendanceThreshold?: number;
}

export class UpdateSystemSettingsDto {
  @ApiProperty({ description: 'Timezone', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ description: 'Date format', required: false })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiProperty({ description: 'Currency code', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Language code', required: false })
  @IsOptional()
  @IsString()
  language?: string;
}

export class UpdateSchoolConfigDto {
  @ApiProperty({ description: 'School name', required: false })
  @IsOptional()
  @IsString()
  schoolName?: string;

  @ApiProperty({ description: 'School logo URL', required: false })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ description: 'School motto', required: false })
  @IsOptional()
  @IsString()
  motto?: string;

  @ApiProperty({ description: 'Principal name', required: false })
  @IsOptional()
  @IsString()
  principalName?: string;

  @ApiProperty({ description: 'Principal email', required: false })
  @IsOptional()
  @IsString()
  principalEmail?: string;

  @ApiProperty({ description: 'Established year', required: false })
  @IsOptional()
  @IsString()
  establishedYear?: string;

  @ApiProperty({ description: 'School type', required: false })
  @IsOptional()
  @IsString()
  schoolType?: string;

  @ApiProperty({ description: 'Accreditation', required: false })
  @IsOptional()
  @IsString()
  accreditation?: string;

  @ApiProperty({ description: 'Student capacity', required: false })
  @IsOptional()
  @IsString()
  studentCapacity?: string;

  @ApiProperty({ description: 'School description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'School color scheme', required: false })
  @IsOptional()
  @IsString()
  colorScheme?: string;

  @ApiProperty({ description: 'Result template ID', required: false, enum: ['classic', 'modern', 'traditional', 'colorful', 'professional'] })
  @IsOptional()
  @IsString()
  resultTemplateId?: string;

  @ApiProperty({ description: 'School address', type: UpdateSchoolAddressDto, required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateSchoolAddressDto)
  schoolAddress?: UpdateSchoolAddressDto;

  @ApiProperty({ description: 'Contact information', type: UpdateContactInfoDto, required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateContactInfoDto)
  contactInfo?: UpdateContactInfoDto;

  @ApiProperty({ description: 'Academic settings', type: UpdateAcademicSettingsDto, required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateAcademicSettingsDto)
  academicSettings?: UpdateAcademicSettingsDto;

  @ApiProperty({ description: 'System settings', type: UpdateSystemSettingsDto, required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateSystemSettingsDto)
  systemSettings?: UpdateSystemSettingsDto;
}
