import { Module } from '@nestjs/common';
import { ActivityLogService } from '../services/activity-log.service';
import { ActivityLogInterceptor } from '../interceptors/activity-log.interceptor';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ActivityLogService, ActivityLogInterceptor],
  exports: [ActivityLogService, ActivityLogInterceptor],
})
export class ActivityLogModule {}
