import { ApiProperty } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { IsEnum, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PasswordValidator } from '../../../../../utils/password';

export class UpdatePasswordDto {
  @ApiProperty({
    description: 'User number/ID for password update (studentNo, teacherNo, or adminNo)',
    example: 'BRF4/SA/25/0001',
  })
  @IsString()
  @MinLength(2)
  userNo: string;

  @ApiProperty({
    description: 'Type of user updating password',
    enum: UserType,
    example: UserType.ADMIN,
  })
  @IsEnum(UserType)
  userType: UserType;

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
