import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';
import { AuthModule } from '../auth/auth.module';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TopicsController],
  providers: [TopicsService, Encryptor],
  exports: [TopicsService],
})
export class TopicsModule {}
