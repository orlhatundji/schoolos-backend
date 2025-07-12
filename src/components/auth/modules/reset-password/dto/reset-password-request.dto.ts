import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResetPasswordRequestDto {
  @IsEmail()
  @ApiProperty()
  email: string;
}
