import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { IsEmail, IsEnum, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { PasswordValidator } from '../../../../../utils/password';

export class UpdatePasswordDto {
  @ApiPropertyOptional({
    description: 'Email for system/platform admin password update',
    example: 'admin@system.com',
  })
  @ValidateIf((o) => !o.userNo)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'User number/ID for password update (studentNo, teacherNo, or adminNo)',
    example: 'BRF4/SA/25/0001',
  })
  @ValidateIf((o) => !o.email)
  @IsString()
  @MinLength(2)
  userNo?: string;

  @ApiPropertyOptional({
    description: 'Type of user updating password (required when using userNo)',
    enum: UserType,
    example: UserType.ADMIN,
  })
  @ValidateIf((o) => !!o.userNo)
  @IsEnum(UserType)
  userType?: UserType;

  @MinLength(PasswordValidator.GetMinLength())
  @MaxLength(PasswordValidator.GetMaxLength())
  @IsString()
  @Matches(PasswordValidator.ValidationRegex, {
    message: PasswordValidator.ValidationErrorMessage,
  })
  @ApiProperty({ description: PasswordValidator.ValidationErrorMessage })
  password: string;

  @IsString()
  @MinLength(3)
  @ApiProperty()
  token: string;
}
