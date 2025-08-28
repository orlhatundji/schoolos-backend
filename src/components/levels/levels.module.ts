import { Module } from '@nestjs/common';
import { LevelsController } from './levels.controller';
import { LevelsService } from './levels.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RolesManagerModule } from '../roles-manager/roles-manager.module';
import { Encryptor } from '../../utils/encryptor';

@Module({
  imports: [PrismaModule, AuthModule, RolesManagerModule],
  controllers: [LevelsController],
  providers: [LevelsService, Encryptor],
  exports: [LevelsService],
})
export class LevelsModule {}
