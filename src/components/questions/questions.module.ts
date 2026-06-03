import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';
import { AuthModule } from '../auth/auth.module';
import { QuizzesModule } from '../quizzes/quizzes.module';
import { StorageModule } from '../storage/storage.module';
import { QuestionWordTemplateService } from './import/question-word-template.service';
import { QuestionsImportController } from './import/questions-import.controller';
import { QuestionsImportService } from './import/questions-import.service';
import { WordQuestionParser } from './import/word-question.parser';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({
  imports: [PrismaModule, AuthModule, StorageModule, QuizzesModule],
  controllers: [QuestionsController, QuestionsImportController],
  providers: [
    QuestionsService,
    Encryptor,
    QuestionsImportService,
    WordQuestionParser,
    QuestionWordTemplateService,
  ],
  exports: [QuestionsService],
})
export class QuestionsModule {}
