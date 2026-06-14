import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';
import { AuthModule } from '../auth/auth.module';
import { ReceiptsController } from './controllers/receipts.controller';
import { PaymentModule } from './payment.module';
import { PaymentStructuresModule } from './payment-structures/payment-structures.module';
import { PaystackWebhookModule } from './paystack-webhook.module';
import { StudentPaymentsModule } from './student-payments/student-payments.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PaymentModule,
    PaymentStructuresModule,
    StudentPaymentsModule,
    PaystackWebhookModule,
  ],
  controllers: [ReceiptsController],
  providers: [Encryptor],
  exports: [
    PaymentModule,
    PaymentStructuresModule,
    StudentPaymentsModule,
    PaystackWebhookModule,
  ],
})
export class PaymentsModule {}
