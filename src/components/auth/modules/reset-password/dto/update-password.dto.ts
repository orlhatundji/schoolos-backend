import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PasswordValidator } from '../../../../../utils/password';

export class BaseUpdatePasswordDto {
  @IsEmail()
  @ApiProperty()
  email: string;

  @MinLength(PasswordValidator.GetMinLength())
  @MaxLength(PasswordValidator.GetMaxLength())
  @IsString()
  @Matches(PasswordValidator.ValidationRegex, {
    message: PasswordValidator.ValidationErrorMessage,
  })
  @ApiProperty({ description: PasswordValidator.ValidationErrorMessage })
  password: string;
}

export class UpdatePasswordDto extends BaseUpdatePasswordDto {
  @IsString()
  @MinLength(3)
  @ApiProperty()
  token: string;
}
