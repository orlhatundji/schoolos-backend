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

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

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
  avatarUrl: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  address: string;

  @ApiProperty()
  @IsOptional()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsOptional()
  @IsMobilePhone()
  phone: string;
}
