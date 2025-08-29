import { Module } from '@nestjs/common';
import { StudentPaymentsController } from './student-payments.controller';
import { StudentPaymentsService } from './student-payments.service';
import { StudentPaymentsRepository } from './student-payments.repository';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { RolesManagerModule } from '../../roles-manager/roles-manager.module';
import { Encryptor } from '../../../utils/encryptor';

@Module({
  imports: [PrismaModule, AuthModule, RolesManagerModule],
  controllers: [StudentPaymentsController],
  providers: [StudentPaymentsService, StudentPaymentsRepository, Encryptor],
  exports: [StudentPaymentsService],
})
export class StudentPaymentsModule {}
