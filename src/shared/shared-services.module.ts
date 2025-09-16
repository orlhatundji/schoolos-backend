import { Module } from '@nestjs/common';
import { PdfService } from './services';

@Module({
  providers: [PdfService],
  exports: [PdfService],
})
export class SharedServicesModule {}
