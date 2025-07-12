import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
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
    description: PasswordValidator.ValidationErrorMessage,
  })
  password: string;
}
