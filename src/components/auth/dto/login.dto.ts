import { IsEmail } from 'class-validator';
import { BaseLoginDto } from './base-login.dto';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto extends BaseLoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}
