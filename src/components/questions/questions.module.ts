import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({
  imports: [PrismaModule, AuthModule, StorageModule],
  controllers: [QuestionsController],
  providers: [QuestionsService, Encryptor],
  exports: [QuestionsService],
})
export class QuestionsModule {}
