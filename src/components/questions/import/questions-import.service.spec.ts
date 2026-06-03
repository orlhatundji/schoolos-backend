import { BadRequestException } from '@nestjs/common';
import { QuestionStatus, QuestionType, QuizStatus } from '@prisma/client';

import { QuestionsImportService } from './questions-import.service';

describe('QuestionsImportService', () => {
  const file = {
    originalname: 'questions.docx',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 1024,
    buffer: Buffer.from('docx'),
  } as Express.Multer.File;

  const dto = {
    title: 'Midterm Quiz',
    subjectId: 'subject-1',
    levelId: 'level-1',
    estimatedMinutes: 30,
  };

  it('creates a draft quiz, published questions, and quiz-question links in one transaction', async () => {
    const tx = {
      quizQuestion: { create: jest.fn().mockResolvedValue({}) },
      quiz: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ type: 'TEACHER', schoolId: 'school-1' }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const parser = {
      parse: jest.fn().mockReturnValue({
        errors: [],
        questions: [
          {
            questionNumber: 1,
            dto: {
              type: QuestionType.SHORT_ANSWER,
              prompt: { type: 'doc' },
              promptPlainText: 'What gas do plants absorb?',
              config: { acceptedAnswers: ['carbon dioxide'] },
            },
          },
        ],
      }),
    };
    const questionsService = {
      createInTransaction: jest.fn().mockResolvedValue({ id: 'question-1' }),
    };
    const quizzesService = {
      createInTransaction: jest.fn().mockResolvedValue({ id: 'quiz-1' }),
      findById: jest.fn().mockResolvedValue(makeQuiz()),
    };

    const service = new QuestionsImportService(
      prisma as any,
      parser as any,
      questionsService as any,
      quizzesService as any,
    );

    const result = await service.importWordQuiz('user-1', file, dto as any);

    expect(result.success).toBe(true);
    expect(result.createdQuestionCount).toBe(1);
    expect(quizzesService.createInTransaction).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ title: 'Midterm Quiz', status: QuizStatus.DRAFT }),
      tx,
    );
    expect(questionsService.createInTransaction).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        subjectId: 'subject-1',
        levelId: 'level-1',
        status: QuestionStatus.PUBLISHED,
      }),
      tx,
    );
    expect(tx.quizQuestion.create).toHaveBeenCalledWith({
      data: {
        quizId: 'quiz-1',
        questionId: 'question-1',
        order: 0,
        weightOverride: null,
      },
    });
  });

  it('does not start the transaction when parser validation fails', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ type: 'TEACHER', schoolId: 'school-1' }),
      },
      $transaction: jest.fn(),
    };
    const parser = {
      parse: jest.fn().mockReturnValue({
        questions: [],
        errors: [{ questionNumber: 1, field: 'Answer', message: 'Answer is required' }],
      }),
    };

    const service = new QuestionsImportService(
      prisma as any,
      parser as any,
      { createInTransaction: jest.fn() } as any,
      { createInTransaction: jest.fn(), findById: jest.fn() } as any,
    );

    await expect(service.importWordQuiz('user-1', file, dto as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('imports published questions without creating a quiz', async () => {
    const tx = {};
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ type: 'TEACHER', schoolId: 'school-1' }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const parser = makeParser();
    const questionsService = {
      createInTransaction: jest.fn().mockResolvedValue(makeQuiz().questions[0].question),
    };
    const service = new QuestionsImportService(
      prisma as any,
      parser as any,
      questionsService as any,
      { createInTransaction: jest.fn(), findById: jest.fn() } as any,
    );

    const result = await service.importWordQuestions('user-1', file, {
      subjectId: 'subject-1',
      levelId: 'level-1',
    } as any);

    expect(result.success).toBe(true);
    expect(result.createdQuestionCount).toBe(1);
    expect(questionsService.createInTransaction).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        subjectId: 'subject-1',
        levelId: 'level-1',
        status: QuestionStatus.PUBLISHED,
      }),
      tx,
    );
  });

  it('allows system admins to import curated quiz content using canonical metadata', async () => {
    const tx = {
      quizQuestion: { create: jest.fn().mockResolvedValue({}) },
      quiz: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ type: 'SYSTEM_ADMIN', schoolId: null }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const parser = makeParser();
    const questionsService = {
      createInTransaction: jest.fn().mockResolvedValue({ id: 'question-1' }),
    };
    const quizzesService = {
      createInTransaction: jest.fn().mockResolvedValue({ id: 'quiz-1' }),
      findById: jest.fn().mockResolvedValue(makeQuiz()),
    };
    const service = new QuestionsImportService(
      prisma as any,
      parser as any,
      questionsService as any,
      quizzesService as any,
    );

    await service.importWordQuiz('admin-1', file, {
      title: 'Curated quiz',
      canonicalSubjectName: 'Mathematics',
      canonicalLevelCode: 'SS1',
      canonicalTermName: 'First Term',
    } as any);

    expect(quizzesService.createInTransaction).toHaveBeenCalledWith(
      'admin-1',
      expect.objectContaining({
        canonicalSubjectName: 'Mathematics',
        canonicalLevelCode: 'SS1',
        canonicalTermName: 'First Term',
        status: QuizStatus.DRAFT,
      }),
      tx,
    );
    expect(questionsService.createInTransaction).toHaveBeenCalledWith(
      'admin-1',
      expect.objectContaining({
        canonicalSubjectName: 'Mathematics',
        canonicalLevelCode: 'SS1',
        canonicalTermName: 'First Term',
        status: QuestionStatus.PUBLISHED,
      }),
      tx,
    );
  });
});

function makeParser() {
  return {
    parse: jest.fn().mockReturnValue({
      errors: [],
      questions: [
        {
          questionNumber: 1,
          dto: {
            type: QuestionType.SHORT_ANSWER,
            prompt: { type: 'doc' },
            promptPlainText: 'What gas do plants absorb?',
            config: { acceptedAnswers: ['carbon dioxide'] },
          },
        },
      ],
    }),
  };
}

function makeQuiz() {
  return {
    id: 'quiz-1',
    ownerType: 'TEACHER_AUTHORED',
    schoolId: 'school-1',
    authorUserId: 'user-1',
    title: 'Midterm Quiz',
    description: null,
    instructions: null,
    subjectId: 'subject-1',
    levelId: 'level-1',
    defaultTermId: null,
    canonicalSubjectName: 'Mathematics',
    canonicalLevelCode: 'SS1',
    canonicalTermName: null,
    status: QuizStatus.DRAFT,
    estimatedMinutes: 30,
    passMarkPercent: null,
    difficulty: null,
    defaultSettings: null,
    sourceQuizId: null,
    version: 2,
    topics: [],
    questions: [
      {
        questionId: 'question-1',
        order: 0,
        weightOverride: null,
        question: {
          id: 'question-1',
          ownerType: 'TEACHER_AUTHORED',
          schoolId: 'school-1',
          authorUserId: 'user-1',
          subjectId: 'subject-1',
          levelId: 'level-1',
          defaultTermId: null,
          canonicalSubjectName: 'Mathematics',
          canonicalLevelCode: 'SS1',
          canonicalTermName: null,
          type: QuestionType.SHORT_ANSWER,
          prompt: { type: 'doc' },
          promptPlainText: 'What gas do plants absorb?',
          mediaUrls: [],
          explanation: null,
          weight: { toString: () => '1.00' },
          difficulty: null,
          status: QuestionStatus.PUBLISHED,
          version: 1,
          sourceQuestionId: null,
          config: { acceptedAnswers: ['carbon dioxide'] },
          partialCreditMode: null,
          options: [],
          topics: [],
          popularExams: [],
          _count: { quizUses: 1 },
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
      },
    ],
    _count: { questions: 1, assignments: 0 },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}
