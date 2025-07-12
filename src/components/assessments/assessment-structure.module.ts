import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AssessmentStructureService } from './assessment-structure.service';
import { AssessmentStructureController } from './assessment-structure.controller';
import { AssessmentStructureRepository } from './assessment-structure.repository';
import { AssessmentComponentRepository } from './assessment-component.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    AssessmentStructureService,
    AssessmentStructureRepository,
    AssessmentComponentRepository,
  ],
  controllers: [AssessmentStructureController],
  exports: [AssessmentStructureService],
})
export class AssessmentStructureModule {}
