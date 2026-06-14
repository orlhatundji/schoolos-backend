import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { PrismaModule } from '../../prisma/prisma.module';
import { SharedServicesModule } from '../../shared/shared-services.module';
import { PaymentActivityListener } from './listeners/payment-activity.listener';
import { PaymentService } from './payment.service';
import { PaystackModule } from './paystack/paystack.module';
import { PaymentReceiptModule } from './receipts/payment-receipt.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    PrismaModule,
    SharedServicesModule,
    PaystackModule,
    PaymentReceiptModule,
  ],
  providers: [PaymentService, PaymentActivityListener],
  exports: [PaymentService],
})
export class PaymentModule {}
