import { ApiProperty } from '@nestjs/swagger';

export class SchoolAddressDto {
  @ApiProperty({ description: 'Street address line 1' })
  street: string;

  @ApiProperty({ description: 'Street address line 2', required: false })
  street2?: string;

  @ApiProperty({ description: 'City' })
  city: string;

  @ApiProperty({ description: 'State' })
  state: string;

  @ApiProperty({ description: 'Country' })
  country: string;

  @ApiProperty({ description: 'Postal code', required: false })
  postalCode?: string;
}

export class ContactInfoDto {
  @ApiProperty({ description: 'Phone number', required: false })
  phone?: string;

  @ApiProperty({ description: 'Email address', required: false })
  email?: string;

  @ApiProperty({ description: 'Website URL', required: false })
  website?: string;
}

export class AcademicSettingsDto {
  @ApiProperty({ description: 'Grading system', enum: ['PERCENTAGE', 'LETTER_GRADE', 'POINTS'] })
  gradingSystem: string;

  @ApiProperty({ description: 'Pass mark percentage' })
  passMark: number;

  @ApiProperty({ description: 'Maximum score' })
  maxScore: number;

  @ApiProperty({ description: 'Attendance threshold percentage' })
  attendanceThreshold: number;
}

export class SystemSettingsDto {
  @ApiProperty({ description: 'Timezone' })
  timezone: string;

  @ApiProperty({ description: 'Date format' })
  dateFormat: string;

  @ApiProperty({ description: 'Currency code' })
  currency: string;

  @ApiProperty({ description: 'Language code' })
  language: string;
}

export class SchoolConfigDto {
  @ApiProperty({ description: 'School name' })
  schoolName: string;

  @ApiProperty({ description: 'School code' })
  schoolCode: string;

  @ApiProperty({ description: 'School logo URL', required: false })
  logoUrl?: string;

  @ApiProperty({ description: 'School motto', required: false })
  motto?: string;

  @ApiProperty({ description: 'Principal name', required: false })
  principalName?: string;

  @ApiProperty({ description: 'Principal email', required: false })
  principalEmail?: string;

  @ApiProperty({ description: 'Established year', required: false })
  establishedYear?: string;

  @ApiProperty({ description: 'School type', required: false })
  schoolType?: string;

  @ApiProperty({ description: 'Accreditation', required: false })
  accreditation?: string;

  @ApiProperty({ description: 'Student capacity', required: false })
  studentCapacity?: string;

  @ApiProperty({ description: 'School description', required: false })
  description?: string;

  @ApiProperty({ description: 'School color scheme', required: false })
  colorScheme?: string;

  @ApiProperty({ description: 'Result template ID', required: false, enum: ['classic', 'modern', 'traditional', 'colorful', 'professional'] })
  resultTemplateId?: string;

  @ApiProperty({ description: 'School address', type: SchoolAddressDto, required: false })
  schoolAddress?: SchoolAddressDto;

  @ApiProperty({ description: 'Contact information', type: ContactInfoDto })
  contactInfo: ContactInfoDto;

  @ApiProperty({ description: 'Academic settings', type: AcademicSettingsDto })
  academicSettings: AcademicSettingsDto;

  @ApiProperty({ description: 'System settings', type: SystemSettingsDto })
  systemSettings: SystemSettingsDto;
}
