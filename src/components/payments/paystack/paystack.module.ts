import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../../../prisma/prisma.module';
import { PaystackApiClient } from './paystack-api.client';
import { PaystackEventRepository } from './paystack-event.repository';
import { PaystackSignatureVerifier } from './paystack-signature.verifier';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [PaystackApiClient, PaystackSignatureVerifier, PaystackEventRepository],
  exports: [PaystackApiClient, PaystackSignatureVerifier, PaystackEventRepository],
})
export class PaystackModule {}
