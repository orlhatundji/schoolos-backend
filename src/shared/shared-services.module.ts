import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfService } from './services';
import { PaystackService } from './services/paystack.service';
import { FeeCalculationService } from './services/fee-calculation.service';
import { CurrentTermService } from './services/current-term.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [PdfService, PaystackService, FeeCalculationService, CurrentTermService],
  exports: [PdfService, PaystackService, FeeCalculationService, CurrentTermService],
})
export class SharedServicesModule {}
