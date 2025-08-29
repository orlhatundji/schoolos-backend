import { Module } from '@nestjs/common';
import { PaymentStructuresModule } from './payment-structures/payment-structures.module';
import { StudentPaymentsModule } from './student-payments/student-payments.module';

@Module({
  imports: [PaymentStructuresModule, StudentPaymentsModule],
  exports: [PaymentStructuresModule, StudentPaymentsModule],
})
export class PaymentsModule {}
