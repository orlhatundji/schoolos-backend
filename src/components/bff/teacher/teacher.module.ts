import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ActivityLogModule } from '../../../common/modules/activity-log.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SharedServicesModule } from '../../../shared/shared-services.module';
import { ClassroomBroadsheetBuilder } from '../../../utils/classroom-broadsheet.util';
import { Encryptor } from '../../../utils/encryptor';
import { PasswordHasher } from '../../../utils/hasher';
import { AssessmentStructuresModule } from '../../assessment-structures/assessment-structures.module';
import { JwtAuthModule } from '../../auth/strategies/jwt/jwt-auth.module';
import { PaymentModule } from '../../payments/payment.module';
import { ResultCommentsModule } from '../../result-comments/result-comments.module';
import { StorageModule } from '../../storage/storage.module';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';

@Module({
  imports: [
    PrismaModule,
    ActivityLogModule,
    JwtAuthModule,
    ConfigModule,
    AssessmentStructuresModule,
    StorageModule,
    SharedServicesModule,
    ResultCommentsModule,
    PaymentModule,
  ],
  controllers: [TeacherController],
  providers: [TeacherService, Encryptor, PasswordHasher, ClassroomBroadsheetBuilder],
  exports: [TeacherService],
})
export class TeacherModule {}
