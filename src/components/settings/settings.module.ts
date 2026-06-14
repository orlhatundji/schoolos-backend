import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { SharedServicesModule } from '../../shared/shared-services.module';
import { Encryptor } from '../../utils/encryptor';
import { PaymentModule } from '../payments/payment.module';
import { SchoolsModule } from '../schools/schools.module';
import { StorageModule } from '../storage/storage.module';
import { BankAccountController } from './bank-account/bank-account.controller';
import { BankAccountService } from './bank-account/bank-account.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [SchoolsModule, PrismaModule, StorageModule, SharedServicesModule, PaymentModule],
  controllers: [SettingsController, BankAccountController],
  providers: [SettingsService, Encryptor, BankAccountService],
  exports: [SettingsService, BankAccountService],
})
export class SettingsModule {}
