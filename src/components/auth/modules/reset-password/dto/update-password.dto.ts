import { ApiProperty } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

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

  @IsString()
  @MinLength(6)
  @MaxLength(40)
  @ApiProperty({ description: 'New password (min 4 chars for students, stricter rules for staff)' })
  password: string;

  @IsString()
  @MinLength(3)
  @ApiProperty()
  token: string;
}
