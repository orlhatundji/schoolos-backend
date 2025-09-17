import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../../prisma/prisma.module';
import { SharedServicesModule } from '../../shared/shared-services.module';
import { PaystackWebhookController } from './controllers/paystack-webhook.controller';
import { PaystackWebhookService } from './services/paystack-webhook.service';

@Module({
  imports: [PrismaModule, SharedServicesModule, ConfigModule],
  controllers: [PaystackWebhookController],
  providers: [PaystackWebhookService],
  exports: [PaystackWebhookService],
})
export class PaystackWebhookModule {}
