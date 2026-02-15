import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../../../prisma/prisma.module';
import { ActivityLogModule } from '../../../common/modules/activity-log.module';
import { JwtAuthModule } from '../../auth/strategies/jwt/jwt-auth.module';
import { Encryptor } from '../../../utils/encryptor';
import { PasswordHasher } from '../../../utils/hasher';
import { PaystackService } from '../../../shared/services/paystack.service';
import { AssessmentStructuresModule } from '../../assessment-structures/assessment-structures.module';
import { ClassroomBroadsheetBuilder } from '../../../utils/classroom-broadsheet.util';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';

@Module({
  imports: [PrismaModule, ActivityLogModule, JwtAuthModule, ConfigModule, AssessmentStructuresModule],
  controllers: [TeacherController],
  providers: [TeacherService, Encryptor, PasswordHasher, PaystackService, ClassroomBroadsheetBuilder],
  exports: [TeacherService],
})
export class TeacherModule {}
