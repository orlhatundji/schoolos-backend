import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../../../prisma/prisma.module';
import { ActivityLogModule } from '../../../common/modules/activity-log.module';
import { JwtAuthModule } from '../../auth/strategies/jwt/jwt-auth.module';
import { Encryptor } from '../../../utils/encryptor';
import { PasswordHasher } from '../../../utils/hasher';
import { PaystackService } from '../../../shared/services/paystack.service';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';

@Module({
  imports: [PrismaModule, ActivityLogModule, JwtAuthModule, ConfigModule],
  controllers: [TeacherController],
  providers: [TeacherService, Encryptor, PasswordHasher, PaystackService],
  exports: [TeacherService],
})
export class TeacherModule {}
