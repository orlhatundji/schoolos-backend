import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SharedServicesModule } from '../../shared/shared-services.module';
import { AssessmentStructuresModule } from '../assessment-structures/assessment-structures.module';
import { ResultCommentsService } from './result-comments.service';
import { ClassroomBroadsheetBuilder } from '../../utils/classroom-broadsheet.util';

@Module({
  imports: [PrismaModule, SharedServicesModule, AssessmentStructuresModule],
  providers: [ResultCommentsService, ClassroomBroadsheetBuilder],
  exports: [ResultCommentsService],
})
export class ResultCommentsModule {}
