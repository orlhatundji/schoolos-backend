import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';
import { AuthModule } from '../auth/auth.module';
import { QuizAssignmentsController } from './quiz-assignments.controller';
import { QuizAssignmentsService } from './quiz-assignments.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [QuizAssignmentsController],
  providers: [QuizAssignmentsService, Encryptor],
  exports: [QuizAssignmentsService],
})
export class QuizAssignmentsModule {}
