import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';
import { AuthModule } from '../auth/auth.module';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [QuestionsController],
  providers: [QuestionsService, Encryptor],
  exports: [QuestionsService],
})
export class QuestionsModule {}
