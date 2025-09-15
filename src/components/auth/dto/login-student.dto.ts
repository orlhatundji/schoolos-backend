import { IsString, MinLength } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { BaseLoginDto } from './base-login.dto';

export class LoginStudentDto extends BaseLoginDto {
  @IsString()
  @MinLength(2)
  @ApiProperty({
    description: 'Student number/ID for authentication',
    example: 'STU001',
    minLength: 2,
  })
  studentNo: string;
}
