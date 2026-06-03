import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { QuestionDifficulty, QuestionStatus, QuizStatus } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { CreateQuizDto } from '../../quizzes/dto';
import { QuestionResult } from '../results/question.result';
import { QuizDetailResult } from '../../quizzes/results/quiz.result';
import { QuizzesService } from '../../quizzes/quizzes.service';
import { UserTypes } from '../../users/constants';
import { QuestionsService } from '../questions.service';
import { ImportWordQuestionsDto, ImportWordQuizDto } from './dto/import-word-quiz.dto';
import {
  ImportWordQuestionsResult,
  ImportWordQuizResult,
  WordQuestionImportErrorResult,
} from './results/import-word-quiz.result';
import { ParsedWordQuestion, WordQuestionParser } from './word-question.parser';

const DOCX_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
]);
const MAX_DOCX_SIZE = 10 * 1024 * 1024;

interface CallerContext {
  type: string;
  schoolId: string | null;
}

@Injectable()
export class QuestionsImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: WordQuestionParser,
    private readonly questionsService: QuestionsService,
    private readonly quizzesService: QuizzesService,
  ) {}

  async importWordQuestions(
    userId: string,
    file: Express.Multer.File,
    dto: ImportWordQuestionsDto,
  ) {
    const caller = await this.getCaller(userId);
    this.validateFile(file);
    this.validateMetadata(dto, caller);

    const parsed = this.parseOrThrow(file);
    const questions = await this.prisma.$transaction(
      async (tx) => {
        const created = [];
        for (const parsedQuestion of parsed) {
          const question = await this.questionsService.createInTransaction(
            userId,
            this.toCreateQuestionDto(parsedQuestion, dto),
            tx,
          );
          created.push(question);
        }
        return created;
      },
      { timeout: 300000, maxWait: 10000 },
    );

    return new ImportWordQuestionsResult(questions.map((q) => new QuestionResult(q)));
  }

  async importWordQuiz(userId: string, file: Express.Multer.File, dto: ImportWordQuizDto) {
    const caller = await this.getCaller(userId);
    this.validateFile(file);
    this.validateQuizDto(dto);
    this.validateMetadata(dto, caller);

    const parsed = this.parseOrThrow(file);

    let createdQuestionCount = 0;
    const quizId = await this.prisma.$transaction(
      async (tx) => {
        const quiz = await this.quizzesService.createInTransaction(userId, this.toCreateQuizDto(dto), tx);

        for (let i = 0; i < parsed.length; i++) {
          const parsedQuestion = parsed[i];
          const question = await this.questionsService.createInTransaction(
            userId,
            this.toCreateQuestionDto(parsedQuestion, dto),
            tx,
          );

          await tx.quizQuestion.create({
            data: {
              quizId: quiz.id,
              questionId: question.id,
              order: i,
              weightOverride: null,
            },
          });
          createdQuestionCount++;
        }

        await tx.quiz.update({
          where: { id: quiz.id },
          data: { version: { increment: 1 } },
        });

        return quiz.id;
      },
      { timeout: 300000, maxWait: 10000 },
    );

    const quiz = await this.quizzesService.findById(userId, quizId);
    return new ImportWordQuizResult(new QuizDetailResult(quiz), createdQuestionCount);
  }

  private async getCaller(userId: string): Promise<CallerContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true, schoolId: true },
    });
    if (!user) throw new ForbiddenException('Caller not found');
    if (user.type !== UserTypes.TEACHER && user.type !== UserTypes.SYSTEM_ADMIN) {
      throw new ForbiddenException('Only teachers and system admins can import Word questions');
    }
    return user;
  }

  private parseOrThrow(file: Express.Multer.File) {
    const parsed = this.parser.parse(file);
    if (parsed.errors.length > 0) {
      throw new BadRequestException({
        message: 'Word question import validation failed',
        errors: parsed.errors.map((error) => new WordQuestionImportErrorResult(error)),
      });
    }
    return parsed.questions;
  }

  private validateMetadata(dto: ImportWordQuestionsDto, caller: CallerContext) {
    if (caller.type === UserTypes.TEACHER) {
      if (!caller.schoolId) {
        throw new BadRequestException('Teacher has no schoolId');
      }
      if (!dto.subjectId) throw new BadRequestException('subjectId is required');
      if (!dto.levelId) throw new BadRequestException('levelId is required');
      return;
    }

    if (!dto.canonicalSubjectName?.trim()) {
      throw new BadRequestException('canonicalSubjectName is required');
    }
    if (!dto.canonicalLevelCode?.trim()) {
      throw new BadRequestException('canonicalLevelCode is required');
    }
  }

  private validateQuizDto(dto: ImportWordQuizDto) {
    if (!dto.title?.trim()) throw new BadRequestException('title is required');
  }

  private toCreateQuestionDto(parsedQuestion: ParsedWordQuestion, dto: ImportWordQuestionsDto) {
    return {
      ...parsedQuestion.dto,
      subjectId: dto.subjectId,
      levelId: dto.levelId,
      defaultTermId: dto.defaultTermId,
      canonicalSubjectName: dto.canonicalSubjectName,
      canonicalLevelCode: dto.canonicalLevelCode,
      canonicalTermName: dto.canonicalTermName,
      difficulty: parsedQuestion.dto.difficulty ?? (dto.difficulty as QuestionDifficulty),
      topicIds: dto.topicIds,
      status: QuestionStatus.PUBLISHED,
    };
  }

  private validateFile(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (file.size > MAX_DOCX_SIZE) {
      throw new BadRequestException('Word file exceeds the 10MB upload limit');
    }
    const extension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (extension !== '.docx') {
      throw new BadRequestException('Only .docx Word files are supported');
    }
    if (file.mimetype && !DOCX_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Upload a Microsoft Word .docx file.');
    }
  }

  private toCreateQuizDto(dto: ImportWordQuizDto): CreateQuizDto {
    return {
      title: dto.title,
      description: dto.description,
      instructions: dto.instructions,
      subjectId: dto.subjectId,
      levelId: dto.levelId,
      defaultTermId: dto.defaultTermId,
      canonicalSubjectName: dto.canonicalSubjectName,
      canonicalLevelCode: dto.canonicalLevelCode,
      canonicalTermName: dto.canonicalTermName,
      status: QuizStatus.DRAFT,
      estimatedMinutes: dto.estimatedMinutes,
      passMarkPercent: dto.passMarkPercent,
      difficulty: dto.difficulty,
      defaultSettings: dto.defaultSettings,
      topicIds: dto.topicIds,
    };
  }
}
