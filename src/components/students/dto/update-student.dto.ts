import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsDate,
  IsString,
  IsEnum,
  IsDateString,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { Gender } from '@prisma/client';
import { GuardianInfoDto, MedicalInfoDto, AddressDto } from './create-student.dto';

export class UpdateStudentDto {
  // --- User-level fields ---

  @ApiProperty({ required: false, description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false, description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false, description: 'Gender' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ required: false, description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ required: false, description: 'State of origin' })
  @IsOptional()
  @IsString()
  stateOfOrigin?: string;

  // --- Student-level fields ---

  @ApiProperty({ required: false, description: 'Class arm ID' })
  @IsOptional()
  @IsUUID()
  classArmId?: string;

  @ApiProperty({ required: false, description: 'Guardian ID' })
  @IsOptional()
  @IsUUID()
  guardianId?: string;

  @ApiProperty({ required: false, description: 'Admission date' })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => new Date(value))
  admissionDate?: Date;

  @ApiProperty({ required: false, description: 'Admission number' })
  @IsOptional()
  @IsString()
  admissionNo?: string;

  @ApiProperty({ required: false, description: 'Guardian information' })
  @IsOptional()
  @ValidateIf((o) => o.guardianInformation && Object.keys(o.guardianInformation).length > 0)
  @ValidateNested()
  @Type(() => GuardianInfoDto)
  guardianInformation?: GuardianInfoDto;

  @ApiProperty({ required: false, description: 'Medical information' })
  @IsOptional()
  @ValidateIf((o) => o.medicalInformation && Object.keys(o.medicalInformation).length > 0)
  @ValidateNested()
  @Type(() => MedicalInfoDto)
  medicalInformation?: MedicalInfoDto;

  @ApiProperty({ required: false, description: 'Address information' })
  @IsOptional()
  @ValidateIf((o) => o.address && Object.keys(o.address).length > 0)
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiProperty({ required: false, description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
