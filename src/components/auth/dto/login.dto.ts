import { IsEmail, IsEnum, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { BaseLoginDto } from './base-login.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserType } from '@prisma/client';

export class LoginDto extends BaseLoginDto {
  @ApiPropertyOptional({
    description: 'Email for system/platform admin login',
    example: 'admin@system.com',
  })
  @ValidateIf((o) => !o.userNo)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'User number/ID for authentication (studentNo, teacherNo, or adminNo)',
    example: 'BRF4/S/25/0001',
  })
  @ValidateIf((o) => !o.email)
  @IsString()
  @MinLength(2)
  userNo?: string;

  @ApiPropertyOptional({
    description: 'Type of user logging in (required when using userNo)',
    enum: UserType,
    example: UserType.STUDENT,
  })
  @ValidateIf((o) => !!o.userNo)
  @IsEnum(UserType)
  userType?: UserType;
}
