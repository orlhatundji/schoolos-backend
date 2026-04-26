import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';

export class RequestPaymentDto {
  @ApiProperty({ description: 'Student ID to request payment from' })
  @IsNotEmpty()
  @IsString()
  studentId: string;

  @ApiProperty({ description: 'Payment structure ID to base the payment on' })
  @IsNotEmpty()
  @IsString()
  paymentStructureId: string;

  @ApiProperty({ description: 'Due date for the payment (defaults to structure due date or now)', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
