import { Module } from '@nestjs/common';

import { PaystackWebhookController } from './controllers/paystack-webhook.controller';
import { PaymentModule } from './payment.module';
import { PaystackModule } from './paystack/paystack.module';
import { PaystackWebhookService } from './services/paystack-webhook.service';

@Module({
  imports: [PaymentModule, PaystackModule],
  controllers: [PaystackWebhookController],
  providers: [PaystackWebhookService],
  exports: [PaystackWebhookService],
})
export class PaystackWebhookModule {}
