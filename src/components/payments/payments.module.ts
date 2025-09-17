import { Module } from '@nestjs/common';
import { PaymentStructuresModule } from './payment-structures/payment-structures.module';
import { StudentPaymentsModule } from './student-payments/student-payments.module';
import { PaystackWebhookModule } from './paystack-webhook.module';

@Module({
  imports: [PaymentStructuresModule, StudentPaymentsModule, PaystackWebhookModule],
  exports: [PaymentStructuresModule, StudentPaymentsModule, PaystackWebhookModule],
})
export class PaymentsModule {}
