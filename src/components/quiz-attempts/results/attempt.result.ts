import { ApiProperty } from '@nestjs/swagger';
import {
  PartialCreditMode,
  Question,
  QuestionOption,
  QuestionResponse,
  QuestionType,
  QuizAttempt,
  QuizAttemptStatus,
  QuizQuestion,
} from '@prisma/client';

export type AttemptForView = QuizAttempt & {
  responses: (QuestionResponse & {
    question: Question & { options: QuestionOption[]; quizUses: QuizQuestion[] };
  })[];
};

export interface AttemptViewContext {
  /** Whether scores + correctness should be exposed (after submission + release). */
  resultsVisible: boolean;
  /** Whether to expose per-question correct answer / explanation (only when results visible). */
  showCorrectAnswers: boolean;
}

export class StudentOptionResult {
  @ApiProperty() id: string;
  @ApiProperty() order: number;
  @ApiProperty({ description: 'TipTap JSON' }) label: unknown;
  @ApiProperty() labelPlainText: string;
  @ApiProperty({ required: false, nullable: true }) mediaUrl: string | null;
  @ApiProperty({
    required: false,
    description: 'Only included when results are visible AND showCorrectAnswers',
  })
  isCorrect?: boolean;

  constructor(o: QuestionOption, includeCorrect: boolean) {
    this.id = o.id;
    this.order = o.order;
    this.label = o.label;
    this.labelPlainText = o.labelPlainText;
    this.mediaUrl = o.mediaUrl;
    if (includeCorrect) this.isCorrect = o.isCorrect;
  }
}

export class StudentQuestionResult {
  @ApiProperty() id: string;
  @ApiProperty({ enum: QuestionType }) type: QuestionType;
  @ApiProperty({ description: 'TipTap JSON' }) prompt: unknown;
  @ApiProperty() promptPlainText: string;
  @ApiProperty({ type: [String] }) mediaUrls: string[];
  @ApiProperty({ description: 'Resolved weight (override or base), as decimal string' })
  weight: string;
  @ApiProperty({ type: [StudentOptionResult] }) options: StudentOptionResult[];
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Type-specific config (NUMERIC unit etc). Sensitive fields stripped during attempt.',
  })
  config: unknown;
  @ApiProperty({ enum: PartialCreditMode, required: false, nullable: true })
  partialCreditMode: PartialCreditMode | null;
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Only included when results are visible AND showCorrectAnswers',
  })
  explanation?: unknown;

  constructor(
    question: Question & { options: QuestionOption[] },
    weightSnapshot: string,
    ctx: AttemptViewContext,
  ) {
    const reveal = ctx.resultsVisible && ctx.showCorrectAnswers;
    this.id = question.id;
    this.type = question.type;
    this.prompt = question.prompt;
    this.promptPlainText = question.promptPlainText;
    this.mediaUrls = question.mediaUrls;
    this.weight = weightSnapshot;
    this.options = (question.options ?? [])
      .sort((a, b) => a.order - b.order)
      .map((o) => new StudentOptionResult(o, reveal));
    this.partialCreditMode = question.partialCreditMode;
    this.config = reveal ? question.config : redactConfig(question.type, question.config);
    if (reveal) this.explanation = question.explanation;
  }
}

export class StudentResponseResult {
  @ApiProperty() questionId: string;
  @ApiProperty({ required: false, nullable: true, description: 'Whatever the student last saved' })
  responseJson: unknown;
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Only present when results are visible',
  })
  pointsAwarded?: string | null;
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Only present when results are visible',
  })
  isCorrect?: boolean | null;
  @ApiProperty({ description: 'Decimal string', required: false })
  weight?: string;

  constructor(
    response: QuestionResponse,
    ctx: AttemptViewContext,
  ) {
    this.questionId = response.questionId;
    this.responseJson = response.responseJson;
    this.weight = response.weight.toString();
    if (ctx.resultsVisible) {
      this.pointsAwarded =
        response.pointsAwarded !== null ? response.pointsAwarded.toString() : null;
      this.isCorrect = response.isCorrect;
    }
  }
}

export class AttemptResult {
  @ApiProperty() id: string;
  @ApiProperty() quizAssignmentId: string;
  @ApiProperty() studentId: string;
  @ApiProperty() attemptNumber: number;
  @ApiProperty({ enum: QuizAttemptStatus }) status: QuizAttemptStatus;
  @ApiProperty() startedAt: Date;
  @ApiProperty() dueAt: Date;
  @ApiProperty({ required: false, nullable: true }) submittedAt: Date | null;
  @ApiProperty() autoSubmitted: boolean;
  @ApiProperty({ description: 'Decimal string' }) maxScore: string;
  @ApiProperty({ required: false, nullable: true, description: 'Decimal string' })
  totalScore: string | null;
  @ApiProperty({ required: false, nullable: true, description: 'Decimal string' })
  percentage: string | null;
  @ApiProperty({
    description:
      'Computed: true if results may be shown to the student now (showResultsImmediately or resultsReleasedAt set).',
  })
  resultsVisible: boolean;
  @ApiProperty({ type: [StudentQuestionResult] }) questions: StudentQuestionResult[];
  @ApiProperty({ type: [StudentResponseResult] }) responses: StudentResponseResult[];

  constructor(attempt: AttemptForView, ctx: AttemptViewContext, quizId: string) {
    this.id = attempt.id;
    this.quizAssignmentId = attempt.quizAssignmentId;
    this.studentId = attempt.studentId;
    this.attemptNumber = attempt.attemptNumber;
    this.status = attempt.status;
    this.startedAt = attempt.startedAt;
    this.dueAt = attempt.dueAt;
    this.submittedAt = attempt.submittedAt;
    this.autoSubmitted = attempt.autoSubmitted;
    this.maxScore = attempt.maxScore.toString();
    this.totalScore = attempt.totalScore !== null ? attempt.totalScore.toString() : null;
    this.percentage = attempt.percentage !== null ? attempt.percentage.toString() : null;
    this.resultsVisible = ctx.resultsVisible;

    // Display order: respect QuizQuestion.order (joined via question.quizUses where quizId matches).
    const sorted = [...attempt.responses].sort((a, b) => {
      const aOrder = a.question.quizUses.find((qq) => qq.quizId === quizId)?.order ?? 0;
      const bOrder = b.question.quizUses.find((qq) => qq.quizId === quizId)?.order ?? 0;
      return aOrder - bOrder;
    });

    this.questions = sorted.map(
      (r) => new StudentQuestionResult(r.question, r.weight.toString(), ctx),
    );
    this.responses = sorted.map((r) => new StudentResponseResult(r, ctx));

    void quizId;
  }
}

export class AttemptSummaryResult {
  @ApiProperty() id: string;
  @ApiProperty() quizAssignmentId: string;
  @ApiProperty() attemptNumber: number;
  @ApiProperty({ enum: QuizAttemptStatus }) status: QuizAttemptStatus;
  @ApiProperty() startedAt: Date;
  @ApiProperty() dueAt: Date;
  @ApiProperty({ required: false, nullable: true }) submittedAt: Date | null;
  @ApiProperty({ description: 'Decimal string' }) maxScore: string;
  @ApiProperty({ required: false, nullable: true, description: 'Decimal string' })
  totalScore: string | null;
  @ApiProperty({ required: false, nullable: true, description: 'Decimal string' })
  percentage: string | null;
  @ApiProperty() resultsVisible: boolean;

  constructor(attempt: QuizAttempt, resultsVisible: boolean) {
    this.id = attempt.id;
    this.quizAssignmentId = attempt.quizAssignmentId;
    this.attemptNumber = attempt.attemptNumber;
    this.status = attempt.status;
    this.startedAt = attempt.startedAt;
    this.dueAt = attempt.dueAt;
    this.submittedAt = attempt.submittedAt;
    this.maxScore = attempt.maxScore.toString();
    this.totalScore = attempt.totalScore !== null ? attempt.totalScore.toString() : null;
    this.percentage = attempt.percentage !== null ? attempt.percentage.toString() : null;
    this.resultsVisible = resultsVisible;
  }
}

export class AttemptsListResult {
  @ApiProperty({ type: [AttemptSummaryResult] }) items: AttemptSummaryResult[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;

  constructor(items: AttemptSummaryResult[], total: number, page: number, limit: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
  }
}

export class StartAttemptResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty({ type: AttemptResult }) attempt: AttemptResult;

  constructor(attempt: AttemptResult) {
    this.success = true;
    this.message = 'Attempt started';
    this.attempt = attempt;
  }
}

export class SaveResponsesResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty() saved: number;
  @ApiProperty({ description: 'Server-canonical dueAt — client should re-sync timer' })
  dueAt: Date;

  constructor(saved: number, dueAt: Date) {
    this.success = true;
    this.message = `${saved} response(s) saved`;
    this.saved = saved;
    this.dueAt = dueAt;
  }
}

export class SubmitAttemptResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;
  @ApiProperty({ type: AttemptSummaryResult }) attempt: AttemptSummaryResult;

  constructor(attempt: AttemptSummaryResult) {
    this.success = true;
    this.message = 'Attempt submitted; grading is queued';
    this.attempt = attempt;
  }
}

export class PageEventResult {
  @ApiProperty({ default: true }) success: boolean;
  @ApiProperty() message: string;

  constructor() {
    this.success = true;
    this.message = 'Event recorded';
  }
}

/**
 * Strips fields from question.config that would reveal the correct answer.
 * Keeps display-only fields (NUMERIC unit, etc.) so the student UI can show
 * the expected unit alongside the input.
 */
function redactConfig(type: QuestionType, config: unknown) {
  if (config == null || typeof config !== 'object') return null;
  const c = config as Record<string, unknown>;
  switch (type) {
    case QuestionType.NUMERIC:
      return c.unit ? { unit: c.unit } : {};
    case QuestionType.TRUE_FALSE:
    case QuestionType.SHORT_ANSWER:
      return {};
    default:
      return {};
  }
}
