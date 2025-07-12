import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class UpdateUserPasswordDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}
