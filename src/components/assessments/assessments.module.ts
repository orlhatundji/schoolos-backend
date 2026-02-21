import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AssessmentService } from './assessments.service';
import { AssessmentsController } from './assessments.controller';
import { ExcelBulkUploadService } from './services/excel-bulk-upload.service';
import { Encryptor } from '../../utils/encryptor';
import { AssessmentStructuresModule } from '../assessment-structures/assessment-structures.module';

@Module({
  imports: [PrismaModule, AssessmentStructuresModule],
  providers: [AssessmentService, ExcelBulkUploadService, Encryptor],
  controllers: [AssessmentsController],
  exports: [AssessmentService],
})
export class AssessmentsModule {}
