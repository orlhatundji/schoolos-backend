import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { IsEmail, IsEnum, IsString, MinLength, ValidateIf } from 'class-validator';

export class ResetPasswordRequestDto {
  @ApiPropertyOptional({
    description: 'Email for system/platform admin password reset',
    example: 'admin@system.com',
  })
  @ValidateIf((o) => !o.userNo)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'User number/ID for password reset (studentNo, teacherNo, or adminNo)',
    example: 'BRF4/SA/25/0001',
  })
  @ValidateIf((o) => !o.email)
  @IsString()
  @MinLength(2)
  userNo?: string;

  @ApiPropertyOptional({
    description: 'Type of user requesting password reset (required when using userNo)',
    enum: UserType,
    example: UserType.ADMIN,
  })
  @ValidateIf((o) => !!o.userNo)
  @IsEnum(UserType)
  userType?: UserType;
}
