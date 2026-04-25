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
  Topic,
} from '@prisma/client';

type QuestionWithRelations = Question & {
  options: QuestionOption[];
  topics: (QuestionTopic & { topic: Topic })[];
  popularExams: (QuestionPopularExam & { popularExam: PopularExam })[];
  _count?: { quizUses: number };
};

export class QuestionOptionResult {
  @ApiProperty() id: string;
  @ApiProperty() order: number;
  @ApiProperty({ description: 'TipTap JSON document' }) label: unknown;
  @ApiProperty() labelPlainText: string;
  @ApiProperty() isCorrect: boolean;
  @ApiProperty({ required: false, nullable: true }) mediaUrl: string | null;

  constructor(o: QuestionOption) {
    this.id = o.id;
    this.order = o.order;
    this.label = o.label;
    this.labelPlainText = o.labelPlainText;
    this.isCorrect = o.isCorrect;
    this.mediaUrl = o.mediaUrl;
  }
}

export class QuestionTopicTagResult {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;

  constructor(t: Topic) {
    this.id = t.id;
    this.name = t.name;
    this.slug = t.slug;
  }
}

export class QuestionPopularExamTagResult {
  @ApiProperty() id: string;
  @ApiProperty() popularExamId: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty({ required: false, nullable: true }) examYear: number | null;
  @ApiProperty({ required: false, nullable: true }) paperReference: string | null;

  constructor(t: QuestionPopularExam & { popularExam: PopularExam }) {
    this.id = t.id;
    this.popularExamId = t.popularExamId;
    this.code = t.popularExam.code;
    this.name = t.popularExam.name;
    this.examYear = t.examYear;
    this.paperReference = t.paperReference;
  }
}

export class QuestionResult {
  @ApiProperty() id: string;
  @ApiProperty({ enum: QuestionOwnerType }) ownerType: QuestionOwnerType;
  @ApiProperty({ required: false, nullable: true }) schoolId: string | null;
  @ApiProperty() authorUserId: string;
  @ApiProperty({ required: false, nullable: true }) subjectId: string | null;
  @ApiProperty({ required: false, nullable: true }) levelId: string | null;
  @ApiProperty({ required: false, nullable: true }) defaultTermId: string | null;
  @ApiProperty({ required: false, nullable: true }) canonicalSubjectName: string | null;
  @ApiProperty({ required: false, nullable: true }) canonicalLevelCode: string | null;
  @ApiProperty({ required: false, nullable: true }) canonicalTermName: string | null;
  @ApiProperty({ enum: QuestionType }) type: QuestionType;
  @ApiProperty({ description: 'TipTap JSON document' }) prompt: unknown;
  @ApiProperty() promptPlainText: string;
  @ApiProperty({ type: [String] }) mediaUrls: string[];
  @ApiProperty({ required: false, nullable: true, description: 'TipTap JSON document' })
  explanation: unknown;
  @ApiProperty({ description: 'Base weight (default 1.0)' }) weight: string;
  @ApiProperty({ enum: QuestionDifficulty, required: false, nullable: true })
  difficulty: QuestionDifficulty | null;
  @ApiProperty({ enum: QuestionStatus }) status: QuestionStatus;
  @ApiProperty() version: number;
  @ApiProperty({ required: false, nullable: true }) sourceQuestionId: string | null;
  @ApiProperty({ required: false, nullable: true, description: 'Type-specific config (see CreateQuestionDto)' })
  config: unknown;
  @ApiProperty({ enum: PartialCreditMode, required: false, nullable: true })
  partialCreditMode: PartialCreditMode | null;
  @ApiProperty({ type: [QuestionOptionResult] }) options: QuestionOptionResult[];
  @ApiProperty({ type: [QuestionTopicTagResult] }) topics: QuestionTopicTagResult[];
  @ApiProperty({ type: [QuestionPopularExamTagResult] })
  popularExams: QuestionPopularExamTagResult[];
  @ApiProperty({ description: 'Number of quizzes that reference this question' })
  usageCount: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(q: QuestionWithRelations) {
    this.id = q.id;
    this.ownerType = q.ownerType;
    this.schoolId = q.schoolId;
    this.authorUserId = q.authorUserId;
    this.subjectId = q.subjectId;
    this.levelId = q.levelId;
    this.defaultTermId = q.defaultTermId;
    this.canonicalSubjectName = q.canonicalSubjectName;
    this.canonicalLevelCode = q.canonicalLevelCode;
    this.canonicalTermName = q.canonicalTermName;
    this.type = q.type;
    this.prompt = q.prompt;
    this.promptPlainText = q.promptPlainText;
    this.mediaUrls = q.mediaUrls;
    this.explanation = q.explanation;
    this.weight = q.weight.toString();
    this.difficulty = q.difficulty;
    this.status = q.status;
    this.version = q.version;
    this.sourceQuestionId = q.sourceQuestionId;
    this.config = q.config;
    this.partialCreditMode = q.partialCreditMode;
    this.options = q.options
      .sort((a, b) => a.order - b.order)
      .map((o) => new QuestionOptionResult(o));
    this.topics = q.topics.map((t) => new QuestionTopicTagResult(t.topic));
    this.popularExams = q.popularExams.map((p) => new QuestionPopularExamTagResult(p));
    this.usageCount = q._count?.quizUses ?? 0;
    this.createdAt = q.createdAt;
    this.updatedAt = q.updatedAt;
  }
}

export class QuestionsListResult {
  @ApiProperty({ type: [QuestionResult] }) items: QuestionResult[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;

  constructor(items: QuestionResult[], total: number, page: number, limit: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
  }
}

export class CreateQuestionResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty({ type: QuestionResult }) question: QuestionResult;

  constructor(question: QuestionResult) {
    this.success = true;
    this.message = 'Question created successfully';
    this.question = question;
  }
}

export class UpdateQuestionResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty({ type: QuestionResult }) question: QuestionResult;

  constructor(question: QuestionResult) {
    this.success = true;
    this.message = 'Question updated successfully';
    this.question = question;
  }
}

export class DeleteQuestionResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;

  constructor() {
    this.success = true;
    this.message = 'Question archived successfully';
  }
}

export class CloneQuestionResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty({ type: QuestionResult }) question: QuestionResult;

  constructor(question: QuestionResult) {
    this.success = true;
    this.message = 'Question cloned successfully';
    this.question = question;
  }
}
