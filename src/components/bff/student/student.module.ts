import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../prisma/prisma.module';
import { ActivityLogModule } from '../../../common/modules/activity-log.module';
import { JwtAuthModule } from '../../auth/strategies/jwt/jwt-auth.module';
import { SharedServicesModule } from '../../../shared/shared-services.module';
import { Encryptor } from '../../../utils/encryptor';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';

@Module({
  imports: [PrismaModule, ActivityLogModule, JwtAuthModule, SharedServicesModule],
  controllers: [StudentController],
  providers: [StudentService, Encryptor],
  exports: [StudentService],
})
export class StudentModule {}
