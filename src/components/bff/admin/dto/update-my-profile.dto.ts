import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsMobilePhone,
  IsDateString,
  IsUrl,
} from 'class-validator';

enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

/**
 * Self-edit DTO for the logged-in admin's own profile. Email is intentionally
 * omitted — changing the login email needs an OTP verification flow we don't
 * have yet. Password and role/system fields are also off-limits here so this
 * endpoint can never be used to escalate or hijack an account.
 */
export class UpdateMyProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false, enum: Gender })
  @IsOptional()
  @IsEnum(Gender, { message: 'Gender must be either MALE or FEMALE' })
  gender?: Gender;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMobilePhone()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  stateOfOrigin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
