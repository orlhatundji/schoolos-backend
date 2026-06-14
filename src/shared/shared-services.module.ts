import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfService } from './services';
import { FeeCalculationService } from './services/fee-calculation.service';
import { CurrentTermService } from './services/current-term.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [PdfService, FeeCalculationService, CurrentTermService],
  exports: [PdfService, FeeCalculationService, CurrentTermService],
})
export class SharedServicesModule {}
