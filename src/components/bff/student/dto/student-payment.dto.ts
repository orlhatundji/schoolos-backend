import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, IsDateString } from 'class-validator';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  OVERDUE = 'OVERDUE',
  WAIVED = 'WAIVED',
}

export class StudentPaymentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  studentId: string;

  @ApiProperty()
  paymentStructureId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  @ApiProperty()
  dueDate: Date;

  @ApiProperty()
  paidAmount: number;

  @ApiProperty({ required: false })
  paidAt?: Date;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  paymentStructure: {
    id: string;
    name: string;
    description?: string;
    category: string;
    frequency: string;
  };
}

export class StudentPaymentHistoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  paidAmount: number;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  @ApiProperty()
  dueDate: Date;

  @ApiProperty({ required: false })
  paidAt?: Date;

  @ApiProperty()
  paymentStructure: {
    name: string;
    category: string;
  };
}

export class StudentPaymentSummaryDto {
  @ApiProperty()
  totalOutstanding: number;

  @ApiProperty()
  totalPaid: number;

  @ApiProperty()
  overdueAmount: number;

  @ApiProperty()
  pendingAmount: number;

  @ApiProperty()
  totalPayments: number;

  @ApiProperty()
  overdueCount: number;

  @ApiProperty()
  pendingCount: number;
}

export class InitiatePaymentDto {
  @ApiProperty()
  @IsString()
  paymentId: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  amount?: number;
}

export class PaymentVerificationDto {
  @ApiProperty()
  @IsString()
  reference: string;
}

export class FeeBreakdownDto {
  @ApiProperty()
  feeAmount: number;

  @ApiProperty()
  platformFee: number;

  @ApiProperty()
  paystackFee: number;

  @ApiProperty()
  studentTotal: number;

  @ApiProperty()
  schoolReceives: number;
}

export class PaystackPaymentResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
    feeBreakdown: FeeBreakdownDto;
    bankAccountMissing: boolean;
  };
}
