import { ApiProperty } from '@nestjs/swagger';
import {
  PartialCreditMode,
  PopularExam,
  Question,
  QuestionDifficulty,
  QuestionOption,
  QuestionOwnerType,
  QuestionPopularExam,
  QuestionStatus,
  QuestionTopic,
  QuestionType,
  Quiz,
  QuizOwnerType,
  QuizQuestion,
  QuizStatus,
  QuizTopic,
  Topic,
} from '@prisma/client';

import {
  QuestionResult,
} from '../../questions/results/question.result';

type QuestionForQuiz = Question & {
  options: QuestionOption[];
  topics: (QuestionTopic & { topic: Topic })[];
  popularExams: (QuestionPopularExam & { popularExam: PopularExam })[];
  _count?: { quizUses: number };
};

type QuizQuestionWithQuestion = QuizQuestion & { question: QuestionForQuiz };

type QuizWithRelations = Quiz & {
  topics: (QuizTopic & { topic: Topic })[];
  questions: QuizQuestionWithQuestion[];
  _count?: { questions: number; assignments: number };
};

type QuizListItem = Quiz & {
  topics: (QuizTopic & { topic: Topic })[];
  questions: { weightOverride: unknown; question: { weight: unknown } }[];
  _count?: { questions: number; assignments: number };
};

export class QuizTopicTagResult {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;

  constructor(t: Topic) {
    this.id = t.id;
    this.name = t.name;
    this.slug = t.slug;
  }
}

export class QuizQuestionEntryResult {
  @ApiProperty() questionId: string;
  @ApiProperty() order: number;
  @ApiProperty({ required: false, nullable: true, description: 'Decimal as string' })
  weightOverride: string | null;
  @ApiProperty({ description: 'weightOverride ?? question.weight' })
  effectiveWeight: string;
  @ApiProperty({ type: QuestionResult }) question: QuestionResult;

  constructor(qq: QuizQuestionWithQuestion) {
    this.questionId = qq.questionId;
    this.order = qq.order;
    this.weightOverride = qq.weightOverride !== null ? qq.weightOverride.toString() : null;
    this.effectiveWeight = (qq.weightOverride ?? qq.question.weight).toString();
    this.question = new QuestionResult(qq.question);
  }
}

abstract class QuizBase {
  @ApiProperty() id: string;
  @ApiProperty({ enum: QuizOwnerType }) ownerType: QuizOwnerType;
  @ApiProperty({ required: false, nullable: true }) schoolId: string | null;
  @ApiProperty() authorUserId: string;
  @ApiProperty() title: string;
  @ApiProperty({ required: false, nullable: true }) description: string | null;
  @ApiProperty({ required: false, nullable: true }) instructions: string | null;
  @ApiProperty({ required: false, nullable: true }) subjectId: string | null;
  @ApiProperty({ required: false, nullable: true }) levelId: string | null;
  @ApiProperty({ required: false, nullable: true }) defaultTermId: string | null;
  @ApiProperty({ required: false, nullable: true }) canonicalSubjectName: string | null;
  @ApiProperty({ required: false, nullable: true }) canonicalLevelCode: string | null;
  @ApiProperty({ required: false, nullable: true }) canonicalTermName: string | null;
  @ApiProperty({ enum: QuizStatus }) status: QuizStatus;
  @ApiProperty({ required: false, nullable: true }) estimatedMinutes: number | null;
  @ApiProperty({ required: false, nullable: true, description: 'Decimal as string' })
  passMarkPercent: string | null;
  @ApiProperty({ enum: QuestionDifficulty, required: false, nullable: true })
  difficulty: QuestionDifficulty | null;
  @ApiProperty({ required: false, nullable: true, description: 'Default delivery settings (JSON)' })
  defaultSettings: unknown;
  @ApiProperty({ required: false, nullable: true }) sourceQuizId: string | null;
  @ApiProperty() version: number;
  @ApiProperty({ type: [QuizTopicTagResult] }) topics: QuizTopicTagResult[];
  @ApiProperty({ description: 'Number of questions in this quiz' }) questionCount: number;
  @ApiProperty({ description: 'Number of QuizAssignments referencing this quiz' })
  assignmentCount: number;
  @ApiProperty({ description: 'Sum of effective weights across all attached questions, as string' })
  totalWeight: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(q: QuizWithRelations | QuizListItem, totalWeight: string) {
    this.id = q.id;
    this.ownerType = q.ownerType;
    this.schoolId = q.schoolId;
    this.authorUserId = q.authorUserId;
    this.title = q.title;
    this.description = q.description;
    this.instructions = q.instructions;
    this.subjectId = q.subjectId;
    this.levelId = q.levelId;
    this.defaultTermId = q.defaultTermId;
    this.canonicalSubjectName = q.canonicalSubjectName;
    this.canonicalLevelCode = q.canonicalLevelCode;
    this.canonicalTermName = q.canonicalTermName;
    this.status = q.status;
    this.estimatedMinutes = q.estimatedMinutes;
    this.passMarkPercent = q.passMarkPercent !== null ? q.passMarkPercent.toString() : null;
    this.difficulty = q.difficulty;
    this.defaultSettings = q.defaultSettings;
    this.sourceQuizId = q.sourceQuizId;
    this.version = q.version;
    this.topics = q.topics.map((t) => new QuizTopicTagResult(t.topic));
    this.questionCount = q._count?.questions ?? 0;
    this.assignmentCount = q._count?.assignments ?? 0;
    this.totalWeight = totalWeight;
    this.createdAt = q.createdAt;
    this.updatedAt = q.updatedAt;
  }
}

/** Lightweight summary used in list endpoints. */
export class QuizSummaryResult extends QuizBase {
  constructor(q: QuizListItem) {
    const total = q.questions.reduce((sum, qq) => {
      const weight = (qq.weightOverride as { toString(): string } | null) ?? (qq.question.weight as { toString(): string });
      return sum + Number(weight.toString());
    }, 0);
    super(q, total.toFixed(2));
  }
}

/** Full detail used by GET /:id including each composed question. */
export class QuizDetailResult extends QuizBase {
  @ApiProperty({ type: [QuizQuestionEntryResult] }) questions: QuizQuestionEntryResult[];

  constructor(q: QuizWithRelations) {
    const sorted = [...q.questions].sort((a, b) => a.order - b.order);
    const totalWeight = sorted
      .reduce((sum, qq) => {
        const w = (qq.weightOverride ?? qq.question.weight) as { toString(): string };
        return sum + Number(w.toString());
      }, 0)
      .toFixed(2);
    super(q, totalWeight);
    this.questions = sorted.map((qq) => new QuizQuestionEntryResult(qq));
  }
}

export class QuizzesListResult {
  @ApiProperty({ type: [QuizSummaryResult] }) items: QuizSummaryResult[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;

  constructor(items: QuizSummaryResult[], total: number, page: number, limit: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
  }
}

export class CreateQuizResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty({ type: QuizDetailResult }) quiz: QuizDetailResult;

  constructor(quiz: QuizDetailResult) {
    this.success = true;
    this.message = 'Quiz created successfully';
    this.quiz = quiz;
  }
}

export class UpdateQuizResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty({ type: QuizDetailResult }) quiz: QuizDetailResult;

  constructor(quiz: QuizDetailResult) {
    this.success = true;
    this.message = 'Quiz updated successfully';
    this.quiz = quiz;
  }
}

export class DeleteQuizResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;

  constructor() {
    this.success = true;
    this.message = 'Quiz archived successfully';
  }
}

export class CloneQuizResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty({ type: QuizDetailResult }) quiz: QuizDetailResult;

  constructor(quiz: QuizDetailResult) {
    this.success = true;
    this.message = 'Quiz cloned successfully';
    this.quiz = quiz;
  }
}

// suppress unused enum imports
void QuestionType;
void QuestionStatus;
void QuestionOwnerType;
void PartialCreditMode;
