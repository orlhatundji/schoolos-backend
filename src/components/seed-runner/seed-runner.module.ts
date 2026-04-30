import { Module } from '@nestjs/common';

import { PlatformAdminGuard } from '../../common/guards';
import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';
import { AuthModule } from '../auth/auth.module';
import { SeedRunnerController } from './seed-runner.controller';
import { SeedRunnerService } from './seed-runner.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SeedRunnerController],
  providers: [SeedRunnerService, Encryptor, PlatformAdminGuard],
  exports: [SeedRunnerService],
})
export class SeedRunnerModule {}
