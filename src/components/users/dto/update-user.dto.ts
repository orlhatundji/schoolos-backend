import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEmail,
  IsEnum,
  IsMobilePhone,
  IsDateString,
  IsUrl,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

// Define Gender enum for validation
enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export class UpdateUserDto {
  @ApiProperty({ required: false, description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false, description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false, enum: Gender, description: 'Gender' })
  @IsOptional()
  @IsEnum(Gender, { message: 'Gender must be either MALE or FEMALE' })
  gender?: Gender;

  @ApiProperty({ required: false, description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'Phone number' })
  @IsOptional()
  @IsMobilePhone()
  phone?: string;

  @ApiProperty({ required: false, description: 'Date of birth' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ required: false, description: 'Avatar URL' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiProperty({ required: false, description: 'Address ID' })
  @IsOptional()
  @IsUUID()
  addressId?: string;

  @ApiProperty({ required: false, description: 'State of origin' })
  @IsOptional()
  @IsString()
  stateOfOrigin?: string;

  @ApiProperty({ required: false, description: 'Password (for password updates)' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ required: false, description: 'Must update password flag' })
  @IsOptional()
  mustUpdatePassword?: boolean;
}
