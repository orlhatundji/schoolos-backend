import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../prisma/prisma.module';
import { SharedServicesModule } from '../../../shared/shared-services.module';
import { MailQueueModule } from '../../../utils/mail-queue/mail-queue.module';
import { StorageModule } from '../../storage/storage.module';
import { PaymentReceiptListener } from './payment-receipt.listener';
import { PaymentReceiptService } from './payment-receipt.service';

@Module({
  imports: [PrismaModule, SharedServicesModule, StorageModule, MailQueueModule],
  providers: [PaymentReceiptService, PaymentReceiptListener],
  exports: [PaymentReceiptService],
})
export class PaymentReceiptModule {}
