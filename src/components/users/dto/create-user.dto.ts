import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsMobilePhone,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserType } from '@prisma/client';
import { PasswordValidator } from '../../../utils/password';

// Define Gender enum for validation
enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender, { message: 'Gender must be either MALE or FEMALE' })
  gender: Gender;

  @MaxLength(PasswordValidator.GetMaxLength())
  @MinLength(PasswordValidator.GetMinLength())
  @Matches(PasswordValidator.ValidationRegex, {
    message: PasswordValidator.ValidationErrorMessage,
  })
  @IsString()
  @ApiProperty({
    type: String,
    description: PasswordValidator.ValidationErrorMessage,
  })
  password: string;

  @ApiProperty({ enum: UserType })
  @IsEnum(UserType, { message: 'Invalid user type' })
  type: UserType;

  @ApiProperty()
  @IsUUID()
  schoolId: string;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty()
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  addressId?: string;

  @ApiProperty()
  @IsOptional()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsOptional()
  @IsMobilePhone()
  phone: string;
}
