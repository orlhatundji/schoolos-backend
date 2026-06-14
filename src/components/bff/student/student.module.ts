import { Module } from '@nestjs/common';

import { ActivityLogModule } from '../../../common/modules/activity-log.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SharedServicesModule } from '../../../shared/shared-services.module';
import { Encryptor } from '../../../utils/encryptor';
import { PasswordHasher } from '../../../utils/hasher';
import { AssessmentStructuresModule } from '../../assessment-structures/assessment-structures.module';
import { JwtAuthModule } from '../../auth/strategies/jwt/jwt-auth.module';
import { PaymentModule } from '../../payments/payment.module';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';

@Module({
  imports: [
    PrismaModule,
    ActivityLogModule,
    JwtAuthModule,
    SharedServicesModule,
    AssessmentStructuresModule,
    PaymentModule,
  ],
  controllers: [StudentController],
  providers: [StudentService, Encryptor, PasswordHasher],
  exports: [StudentService],
})
export class StudentModule {}
