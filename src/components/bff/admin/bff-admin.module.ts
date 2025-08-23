import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../prisma/prisma.module';
import { Encryptor } from '../../../utils/encryptor';
import { JwtAuthModule } from '../../auth/strategies/jwt/jwt-auth.module';
import { RolesManagerModule } from '../../roles-manager/roles-manager.module';
import { UsersModule } from '../../users/users.module';
import { BffAdminController } from './bff-admin.controller';
import { BffAdminService } from './bff-admin.service';

@Module({
  imports: [PrismaModule, UsersModule, RolesManagerModule, JwtAuthModule],
  controllers: [BffAdminController],
  providers: [BffAdminService, Encryptor],
})
export class BffAdminModule {}
