import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { PasswordValidator } from '../../../utils/password';

export class BaseLoginDto {
  @MaxLength(PasswordValidator.GetMaxLength())
  @MinLength(PasswordValidator.GetMinLength())
  @Matches(PasswordValidator.ValidationRegex, {
    message: PasswordValidator.ValidationErrorMessage,
  })
  @IsString()
  @ApiProperty({
    type: String,
    description:
      'User password - must contain at least one lowercase, uppercase, number, and special character',
    example: 'MySecure123!',
    minLength: 6,
    maxLength: 40,
  })
  password: string;
}
