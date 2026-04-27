import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsEnum, IsDateString, IsString } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class UpdateStudentPaymentDto {
  @ApiProperty({ description: 'Payment status', enum: PaymentStatus, required: false })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiProperty({ description: 'Amount paid', required: false })
  @IsOptional()
  @IsNumber()
  paidAmount?: number;

  @ApiProperty({ description: 'Date when payment was made', required: false })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiProperty({ description: 'User ID who waived the payment', required: false, nullable: true })
  @IsOptional()
  @IsString()
  waivedBy?: string | null;

  @ApiProperty({ description: 'Date when payment was waived', required: false, nullable: true })
  @IsOptional()
  waivedAt?: string | null;

  @ApiProperty({ description: 'Reason for waiving the payment', required: false, nullable: true })
  @IsOptional()
  @IsString()
  waiverReason?: string | null;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
