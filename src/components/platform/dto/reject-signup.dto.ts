import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectSignupDto {
  @ApiProperty({ description: 'Rejection reason' })
  @IsString()
  rejectionReason: string;
}
