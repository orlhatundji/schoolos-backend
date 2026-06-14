import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { SharedServicesModule } from '../../shared/shared-services.module';
import { Encryptor } from '../../utils/encryptor';
import { MailQueueModule } from '../../utils/mail-queue/mail-queue.module';
import { PaymentModule } from '../payments/payment.module';
import { PaystackModule } from '../payments/paystack/paystack.module';
import { StorageModule } from '../storage/storage.module';
import { BillingController } from './billing.controller';
import { BillingCron } from './billing.cron';
import { BillingService } from './billing.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceReceiptListener } from './invoice-receipt/invoice-receipt.listener';
import { InvoiceReceiptService } from './invoice-receipt/invoice-receipt.service';

@Module({
  imports: [PrismaModule, SharedServicesModule, PaystackModule, PaymentModule, StorageModule, MailQueueModule],
  controllers: [BillingController],
  providers: [
    Encryptor,
    BillingService,
    BillingCron,
    InvoicePdfService,
    InvoiceReceiptService,
    InvoiceReceiptListener,
  ],
  exports: [BillingService],
})
export class BillingModule {}
