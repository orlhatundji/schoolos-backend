import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';
import { AuthModule } from '../auth/auth.module';
import { QuizAggregationsController } from './quiz-aggregations.controller';
import { QuizAggregationsService } from './quiz-aggregations.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [QuizAggregationsController],
  providers: [QuizAggregationsService, Encryptor],
  exports: [QuizAggregationsService],
})
export class QuizAggregationsModule {}
