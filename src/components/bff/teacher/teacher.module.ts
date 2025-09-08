import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../prisma/prisma.module';
import { ActivityLogModule } from '../../../common/modules/activity-log.module';
import { JwtAuthModule } from '../../auth/strategies/jwt/jwt-auth.module';
import { Encryptor } from '../../../utils/encryptor';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';

@Module({
  imports: [PrismaModule, ActivityLogModule, JwtAuthModule],
  controllers: [TeacherController],
  providers: [TeacherService, Encryptor],
  exports: [TeacherService],
})
export class TeacherModule {}
