import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PdfService } from './services';
import { PaystackService } from './services/paystack.service';
import { FeeCalculationService } from './services/fee-calculation.service';

@Module({
  imports: [ConfigModule],
  providers: [PdfService, PaystackService, FeeCalculationService],
  exports: [PdfService, PaystackService, FeeCalculationService],
})
export class SharedServicesModule {}
