import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SchoolsModule } from '../schools/schools.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { SharedServicesModule } from '../../shared/shared-services.module';
import { Encryptor } from '../../utils/encryptor';
import { BankAccountController } from './bank-account/bank-account.controller';
import { BankAccountService } from './bank-account/bank-account.service';

@Module({
  imports: [SchoolsModule, PrismaModule, StorageModule, SharedServicesModule],
  controllers: [SettingsController, BankAccountController],
  providers: [SettingsService, Encryptor, BankAccountService],
  exports: [SettingsService, BankAccountService],
})
export class SettingsModule {}
