import { Module } from '@nestjs/common';
import { PaymentStructuresController } from './payment-structures.controller';
import { PaymentStructuresService } from './payment-structures.service';
import { PaymentStructuresRepository } from './payment-structures.repository';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { RolesManagerModule } from '../../roles-manager/roles-manager.module';
import { Encryptor } from '../../../utils/encryptor';

@Module({
  imports: [PrismaModule, AuthModule, RolesManagerModule],
  controllers: [PaymentStructuresController],
  providers: [PaymentStructuresService, PaymentStructuresRepository, Encryptor],
  exports: [PaymentStructuresService],
})
export class PaymentStructuresModule {}
