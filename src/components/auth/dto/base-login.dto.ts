import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BaseLoginDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    description: 'User password',
    example: 'password123',
  })
  password: string;
}
