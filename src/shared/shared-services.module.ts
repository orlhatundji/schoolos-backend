import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PdfService } from './services';
import { PaystackService } from './services/paystack.service';

@Module({
  imports: [ConfigModule],
  providers: [PdfService, PaystackService],
  exports: [PdfService, PaystackService],
})
export class SharedServicesModule {}
