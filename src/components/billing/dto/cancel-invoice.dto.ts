import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelInvoiceDto {
  @ApiProperty({ description: 'Reason for cancelling the invoice (required)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
