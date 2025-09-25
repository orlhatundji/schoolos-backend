import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SchoolsModule } from '../schools/schools.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';

@Module({
  imports: [SchoolsModule, PrismaModule],
  controllers: [SettingsController],
  providers: [SettingsService, Encryptor],
  exports: [SettingsService],
})
export class SettingsModule {}
