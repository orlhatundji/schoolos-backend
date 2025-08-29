import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { PaymentCategory, PaymentFrequency } from '@prisma/client';

export class CreatePaymentStructureDto {
  @ApiProperty({ description: 'Payment structure name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Payment structure description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Currency code', default: 'NGN' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Payment category', enum: PaymentCategory })
  @IsEnum(PaymentCategory)
  category: PaymentCategory;

  @ApiProperty({ description: 'Payment frequency', enum: PaymentFrequency })
  @IsEnum(PaymentFrequency)
  frequency: PaymentFrequency;

  @ApiProperty({ description: 'Academic session ID', required: false })
  @IsOptional()
  @IsString()
  academicSessionId?: string;

  @ApiProperty({ description: 'Term ID', required: false })
  @IsOptional()
  @IsString()
  termId?: string;

  @ApiProperty({ description: 'Level ID', required: false })
  @IsOptional()
  @IsString()
  levelId?: string;

  @ApiProperty({ description: 'Class arm ID', required: false })
  @IsOptional()
  @IsString()
  classArmId?: string;

  @ApiProperty({ description: 'Due date', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ description: 'Whether the payment structure is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
