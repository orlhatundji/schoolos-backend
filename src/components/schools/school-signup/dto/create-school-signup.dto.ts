import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsNumber, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ContactPersonDto {
  @ApiProperty({ description: 'First name of the contact person' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name of the contact person' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Email address of the contact person' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Phone number of the contact person' })
  @IsString()
  phone: string;
}

export class SchoolAddressDto {
  @ApiProperty({ description: 'Country where the school is located' })
  @IsString()
  country: string;

  @ApiProperty({ description: 'State/province where the school is located' })
  @IsString()
  state: string;

  @ApiProperty({ description: 'City where the school is located' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'Primary street address' })
  @IsString()
  street1: string;

  @ApiProperty({ description: 'Secondary street address (optional)', required: false })
  @IsString()
  @IsOptional()
  street2?: string;

  @ApiProperty({ description: 'ZIP/Postal code (optional)', required: false })
  @IsString()
  @IsOptional()
  zip?: string;
}

export class SchoolDetailsDto {
  @ApiProperty({ 
    description: 'Type of school',
    enum: ['PRIMARY', 'SECONDARY', 'MIXED']
  })
  @IsEnum(['PRIMARY', 'SECONDARY', 'MIXED'])
  type: 'PRIMARY' | 'SECONDARY' | 'MIXED';

  @ApiProperty({ description: 'School capacity (optional)', required: false })
  @IsNumber()
  @IsOptional()
  capacity?: number;

  @ApiProperty({ description: 'School website URL (optional)', required: false })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiProperty({ description: 'School description (optional)', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateSchoolSignupDto {
  @ApiProperty({ description: 'Name of the school' })
  @IsString()
  schoolName: string;

  @ApiProperty({ description: 'Unique code for the school' })
  @IsString()
  @IsOptional()
  schoolCode?: string;

  @ApiProperty({ description: 'Contact person details' })
  @ValidateNested()
  @Type(() => ContactPersonDto)
  contactPerson: ContactPersonDto;

  @ApiProperty({ description: 'School address details' })
  @ValidateNested()
  @Type(() => SchoolAddressDto)
  address: SchoolAddressDto;

  @ApiProperty({ description: 'School details' })
  @ValidateNested()
  @Type(() => SchoolDetailsDto)
  schoolDetails: SchoolDetailsDto;
} 