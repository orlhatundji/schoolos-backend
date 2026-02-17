import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsNotEmpty } from 'class-validator';

export class AddBankAccountDto {
  @ApiProperty({ description: 'Paystack bank code (e.g., "058")' })
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiProperty({ description: 'Bank display name (e.g., "GTBank")' })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiProperty({ description: '10-digit NUBAN account number' })
  @IsString()
  @Length(10, 10, { message: 'Account number must be exactly 10 digits' })
  accountNumber: string;
}

export class VerifyBankAccountDto {
  @ApiProperty({ description: 'Paystack bank code' })
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiProperty({ description: '10-digit NUBAN account number' })
  @IsString()
  @Length(10, 10, { message: 'Account number must be exactly 10 digits' })
  accountNumber: string;
}
