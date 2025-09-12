import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  IsEnum,
  IsEmail,
  IsMobilePhone,
  IsUrl,
  IsDateString,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { CreateUserDto } from '../../users/dto';

// Custom validator for emergency contact
@ValidatorConstraint({ name: 'EmergencyContactValidator', async: false })
export class EmergencyContactValidator implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (!value) return true; // Optional field

    // Allow array of strings (phone numbers)
    if (Array.isArray(value)) {
      return value.every((item) => typeof item === 'string' && item.length > 0);
    }

    // Allow object with required fields
    if (typeof value === 'object' && value !== null) {
      return (
        typeof value.name === 'string' &&
        typeof value.phone === 'string' &&
        value.name.length > 0 &&
        value.phone.length > 0
      );
    }

    return false;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Emergency contact must be either an array of phone numbers or an object with name and phone properties';
  }
}

// Address DTO for nested address information
export class AddressDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  street1?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  street2?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  postalCode?: string;
}

// Guardian information DTO
export class GuardianInfoDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  relationship?: string;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}

// Emergency contact DTO
export class EmergencyContactDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  relationship?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  hospital?: string;
}

// Medical information DTO
export class MedicalInfoDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allergies?: string[];

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  medicalConditions?: string[];

  @ApiProperty({
    description:
      'Emergency contact information - can be object with full details or array of phone numbers',
    oneOf: [
      { $ref: '#/components/schemas/EmergencyContactDto' },
      { type: 'array', items: { type: 'string' } },
    ],
  })
  @IsOptional()
  @Validate(EmergencyContactValidator)
  emergencyContact?: EmergencyContactDto | string[];
}

// Define Gender enum for validation
enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export class CreateStudentDto {
  // Personal Information
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender, { message: 'Gender must be either MALE or FEMALE' })
  gender: Gender;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty()
  @IsOptional()
  @IsMobilePhone()
  phone?: string;

  @ApiProperty()
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  addressId?: string;

  // Academic Information
  @ApiProperty()
  @IsUUID()
  classArmId: string;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  guardianId?: string;

  @ApiProperty()
  @IsDate()
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  admissionDate?: Date;

  @ApiProperty()
  @IsString()
  @IsOptional()
  admissionNo?: string;

  // Additional Information
  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => GuardianInfoDto)
  guardianInformation?: GuardianInfoDto;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => MedicalInfoDto)
  medicalInformation?: MedicalInfoDto;

  @ApiProperty()
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}
