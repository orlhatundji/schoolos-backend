import { Module } from '@nestjs/common';
import { AcademicSettingsController } from './academic-settings.controller';
import { AcademicSettingsService } from './academic-settings.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';

@Module({
  imports: [PrismaModule],
  controllers: [AcademicSettingsController],
  providers: [AcademicSettingsService, Encryptor],
  exports: [AcademicSettingsService]
})
export class AcademicSettingsModule {}
