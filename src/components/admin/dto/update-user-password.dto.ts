import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UpdateUserPasswordDto {
  @ApiProperty({ description: 'User ID to reset password for' })
  @IsUUID()
  userId: string;
}
