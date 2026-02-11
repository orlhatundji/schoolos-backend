import { ApiProperty } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class ResetPasswordRequestDto {
  @ApiProperty({
    description: 'User number/ID for password reset (studentNo, teacherNo, or adminNo)',
    example: 'BRF4/SA/25/0001',
  })
  @IsString()
  @MinLength(2)
  userNo: string;

  @ApiProperty({
    description: 'Type of user requesting password reset',
    enum: UserType,
    example: UserType.ADMIN,
  })
  @IsEnum(UserType)
  userType: UserType;
}
