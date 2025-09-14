import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AssessmentService } from './assessments.service';
import { AssessmentsController } from './assessments.controller';
import { AssessmentRepository } from './assessments.repository';
import { ExcelBulkUploadService } from './services/excel-bulk-upload.service';
import { Encryptor } from '../../utils/encryptor';

@Module({
  imports: [PrismaModule],
  providers: [AssessmentService, AssessmentRepository, ExcelBulkUploadService, Encryptor],
  controllers: [AssessmentsController],
  exports: [AssessmentService],
})
export class AssessmentsModule {}
