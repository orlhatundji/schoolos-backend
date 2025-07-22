import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AssessmentService } from './assessments.service';
import { AssessmentsController } from './assessments.controller';
import { AssessmentRepository } from './assessments.repository';

@Module({
  imports: [PrismaModule],
  providers: [AssessmentService, AssessmentRepository],
  controllers: [AssessmentsController],
  exports: [AssessmentService],
})
export class AssessmentsModule {}
