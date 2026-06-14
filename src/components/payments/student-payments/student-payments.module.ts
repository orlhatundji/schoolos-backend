import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../prisma/prisma.module';
import { Encryptor } from '../../../utils/encryptor';
import { AuthModule } from '../../auth/auth.module';
import { RolesManagerModule } from '../../roles-manager/roles-manager.module';
import { PaymentModule } from '../payment.module';
import { StudentPaymentsController } from './student-payments.controller';
import { StudentPaymentsRepository } from './student-payments.repository';
import { StudentPaymentsService } from './student-payments.service';

@Module({
  imports: [PrismaModule, AuthModule, RolesManagerModule, PaymentModule],
  controllers: [StudentPaymentsController],
  providers: [StudentPaymentsService, StudentPaymentsRepository, Encryptor],
  exports: [StudentPaymentsService],
})
export class StudentPaymentsModule {}
