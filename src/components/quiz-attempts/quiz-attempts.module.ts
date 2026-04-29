import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AssessmentsFeatureGuard } from '../../common/guards';
import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';
import { AuthModule } from '../auth/auth.module';
import { GradingService } from './grading/grading.service';
import { QuizAttemptsProcessor } from './processors/quiz-attempts.processor';
import { QuizAttemptsController } from './quiz-attempts.controller';
import { QuizAttemptsQueue } from './quiz-attempts.queue';
import { QuizAttemptsService } from './quiz-attempts.service';
import { QUIZ_ATTEMPTS_QUEUE } from './types';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    BullModule.registerQueue({ name: QUIZ_ATTEMPTS_QUEUE }),
  ],
  controllers: [QuizAttemptsController],
  providers: [
    QuizAttemptsService,
    QuizAttemptsQueue,
    QuizAttemptsProcessor,
    GradingService,
    Encryptor,
    AssessmentsFeatureGuard,
  ],
  exports: [QuizAttemptsService, GradingService],
})
export class QuizAttemptsModule {}
