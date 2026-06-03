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
    this.label = normalizeTipTapMath(o.label);
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
  @ApiProperty({ required: false, nullable: true }) questionNumber: string | null;

  constructor(t: QuestionPopularExam & { popularExam: PopularExam }) {
    this.id = t.id;
    this.popularExamId = t.popularExamId;
    this.code = t.popularExam.code;
    this.name = t.popularExam.name;
    this.examYear = t.examYear;
    this.questionNumber = t.questionNumber;
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
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Type-specific config (see CreateQuestionDto)',
  })
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
    this.prompt = normalizeTipTapMath(q.prompt);
    this.promptPlainText = q.promptPlainText;
    this.mediaUrls = q.mediaUrls;
    this.explanation = normalizeTipTapMath(q.explanation);
    this.weight = q.weight.toString();
    this.difficulty = q.difficulty;
    this.status = q.status;
    this.version = q.version;
    this.sourceQuestionId = q.sourceQuestionId;
    this.config = normalizeQuestionConfig(q.type, q.config);
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

export function normalizeTipTapMath(value: unknown): unknown {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.flatMap((node) => normalizeTipTapNode(node));
  return normalizeTipTapNode(value);
}

export function normalizeQuestionConfig(type: QuestionType, config: unknown): unknown {
  if (type !== QuestionType.SHORT_ANSWER || config == null || typeof config !== 'object') {
    return config;
  }

  const c = config as Record<string, unknown>;
  if (!Array.isArray(c.acceptedAnswers)) return config;

  return {
    ...c,
    acceptedAnswers: c.acceptedAnswers.map((answer) =>
      typeof answer === 'string' ? stripMathDelimiters(answer) : answer,
    ),
  };
}

function normalizeTipTapNode(value: unknown): unknown | unknown[] {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return value;

  const node = value as Record<string, unknown>;
  const type = node.type;
  if (
    (type === 'inlineMath' || type === 'mathInline' || type === 'math_inline') &&
    node.attrs &&
    typeof node.attrs === 'object'
  ) {
    return { ...node, type: 'math_inline' };
  }

  if (type === 'text' && typeof node.text === 'string' && node.text.includes('$')) {
    return splitDollarMathTextNode(node);
  }

  if (Array.isArray(node.content)) {
    return {
      ...node,
      content: node.content.flatMap((child) => normalizeTipTapNode(child)),
    };
  }

  return node;
}

function splitDollarMathTextNode(node: Record<string, unknown>): unknown[] {
  const text = node.text as string;
  const parts: unknown[] = [];
  const mathRegex = /\$(.+?)\$/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(text))) {
    if (match.index > cursor) {
      parts.push({ ...node, text: text.slice(cursor, match.index) });
    }
    parts.push({ type: 'math_inline', attrs: { latex: match[1] } });
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    parts.push({ ...node, text: text.slice(cursor) });
  }

  return parts.length > 0 ? parts : [node];
}

function stripMathDelimiters(value: string) {
  return value.replace(/\$(.+?)\$/g, '$1');
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
    this.message = 'Question deleted successfully';
  }
}

export class ArchiveQuestionResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;

  constructor() {
    this.success = true;
    this.message = 'Question archived successfully';
  }
}

export class BulkDeleteQuestionsResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty() deletedCount: number;
  @ApiProperty() archivedCount: number;

  constructor(counts: { deletedCount: number; archivedCount: number }) {
    this.success = true;
    this.deletedCount = counts.deletedCount;
    this.archivedCount = counts.archivedCount;
    this.message = [
      counts.deletedCount > 0
        ? `${counts.deletedCount} deleted`
        : null,
      counts.archivedCount > 0
        ? `${counts.archivedCount} archived because ${counts.archivedCount === 1 ? 'it is' : 'they are'} used in quizzes`
        : null,
    ]
      .filter(Boolean)
      .join(', ');
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

