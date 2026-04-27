import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  Quiz,
  QuizAttemptOverride,
  QuizAttemptStatus,
  QuizDeliveryMode,
  QuizOverrideType,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { UserTypes } from '../users/constants';
import {
  PageEventDto,
  SaveResponsesDto,
  StartAttemptDto,
} from './dto';
import { GradingService } from './grading/grading.service';
import { QuizAttemptsQueue } from './quiz-attempts.queue';

const ATTEMPT_DETAIL_INCLUDE = {
  responses: {
    include: {
      question: {
        include: {
          options: true,
          quizUses: true,
        },
      },
    },
  },
} as const satisfies Prisma.QuizAttemptInclude;

interface AssignmentForStart {
  id: string;
  quizId: string;
  quizVersion: number;
  classArmSubject: { classArmId: string };
  mode: QuizDeliveryMode;
  windowOpensAt: Date;
  windowClosesAt: Date;
  durationMinutes: number;
  syncGracePeriodSeconds: number | null;
  maxAttempts: number;
  showResultsImmediately: boolean | null;
  showCorrectAnswers: boolean | null;
  resultsReleasedAt: Date | null;
  status: string;
  deletedAt: Date | null;
  termId: string;
  quiz: Pick<Quiz, 'id' | 'status' | 'defaultSettings'>;
}

@Injectable()
export class QuizAttemptsService {
  private readonly logger = new Logger(QuizAttemptsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QuizAttemptsQueue,
    private readonly grading: GradingService,
  ) {}

  // ---------- public API ----------

  async start(callerUserId: string, dto: StartAttemptDto) {
    const studentId = await this.requireStudentId(callerUserId);

    const assignment = await this.prisma.quizAssignment.findFirst({
      where: { id: dto.quizAssignmentId, deletedAt: null },
      include: {
        classArmSubject: { select: { classArmId: true } },
        quiz: { select: { id: true, status: true, defaultSettings: true } },
      },
    });
    if (!assignment) throw new NotFoundException('Quiz assignment not found');
    await this.assertEnrolled(studentId, assignment.classArmSubject.classArmId);

    // If they already have an IN_PROGRESS attempt for this assignment, return it
    // (refresh-resilient — don't burn an attempt on every page reload).
    const existing = await this.prisma.quizAttempt.findFirst({
      where: {
        quizAssignmentId: assignment.id,
        studentId,
        status: QuizAttemptStatus.IN_PROGRESS,
      },
    });
    if (existing) {
      return this.fetchView(existing.id, callerUserId);
    }

    const overrides = await this.prisma.quizAttemptOverride.findMany({
      where: { quizAssignmentId: assignment.id, studentId },
    });

    const now = new Date();
    this.assertWindowAllowsStart(assignment, overrides, now);

    const usedAttempts = await this.prisma.quizAttempt.count({
      where: { quizAssignmentId: assignment.id, studentId },
    });
    const effectiveMax = this.effectiveMaxAttempts(assignment, overrides);
    if (usedAttempts >= effectiveMax) {
      throw new ConflictException(
        `Maximum attempts reached (${effectiveMax}). Ask your teacher for a RETRY override if needed.`,
      );
    }

    const dueAt = this.computeDueAt(assignment, overrides, now);

    const quizQuestions = await this.prisma.quizQuestion.findMany({
      where: { quizId: assignment.quizId },
      include: { question: { select: { id: true, weight: true } } },
      orderBy: { order: 'asc' },
    });
    if (quizQuestions.length === 0) {
      throw new BadRequestException('This quiz has no questions — ask your teacher');
    }

    const maxScore = quizQuestions.reduce((sum, qq) => {
      const w = (qq.weightOverride ?? qq.question.weight) as { toString(): string };
      return sum + Number(w.toString());
    }, 0);

    const lastNumber = await this.prisma.quizAttempt.findFirst({
      where: { quizAssignmentId: assignment.id, studentId },
      orderBy: { attemptNumber: 'desc' },
      select: { attemptNumber: true },
    });
    const attemptNumber = (lastNumber?.attemptNumber ?? 0) + 1;

    const created = await this.prisma.$transaction(async (tx) => {
      const attempt = await tx.quizAttempt.create({
        data: {
          quizAssignmentId: assignment.id,
          studentId,
          attemptNumber,
          startedAt: now,
          dueAt,
          status: QuizAttemptStatus.IN_PROGRESS,
          maxScore: new Prisma.Decimal(maxScore.toFixed(2)),
        },
      });
      await tx.questionResponse.createMany({
        data: quizQuestions.map((qq) => ({
          attemptId: attempt.id,
          questionId: qq.questionId,
          weight: qq.weightOverride ?? qq.question.weight,
        })),
      });
      return attempt;
    });

    return this.fetchView(created.id, callerUserId);
  }

  async saveResponses(callerUserId: string, attemptId: string, dto: SaveResponsesDto) {
    const studentId = await this.requireStudentId(callerUserId);
    const attempt = await this.findOwnedAttemptOrThrow(attemptId, studentId);

    if (attempt.status !== QuizAttemptStatus.IN_PROGRESS) {
      throw new ConflictException('Attempt is no longer accepting responses');
    }
    const now = new Date();
    if (now >= attempt.dueAt) {
      // Auto-submit + reject
      await this.markSubmittedAndEnqueue(attemptId, true);
      throw new ConflictException('Time is up — your attempt has been auto-submitted');
    }

    // Validate every questionId is attached to this attempt.
    const responseIds = await this.prisma.questionResponse.findMany({
      where: { attemptId, questionId: { in: dto.responses.map((r) => r.questionId) } },
      select: { id: true, questionId: true },
    });
    const indexByQuestion = new Map(responseIds.map((r) => [r.questionId, r.id]));
    const unknown = dto.responses.filter((r) => !indexByQuestion.has(r.questionId));
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Question(s) not part of this attempt: ${unknown.map((u) => u.questionId).join(', ')}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const entry of dto.responses) {
        await tx.questionResponse.update({
          where: { id: indexByQuestion.get(entry.questionId)! },
          data: { responseJson: (entry.responseJson ?? null) as Prisma.InputJsonValue | null },
        });
      }
    });

    return { saved: dto.responses.length, dueAt: attempt.dueAt };
  }

  async submit(callerUserId: string, attemptId: string) {
    const studentId = await this.requireStudentId(callerUserId);
    const attempt = await this.findOwnedAttemptOrThrow(attemptId, studentId);
    if (attempt.status !== QuizAttemptStatus.IN_PROGRESS) {
      throw new ConflictException('Attempt is not IN_PROGRESS');
    }

    const now = new Date();
    const late = now > attempt.dueAt;

    await this.markSubmittedAndEnqueue(attemptId, late);

    return this.prisma.quizAttempt.findUniqueOrThrow({ where: { id: attemptId } });
  }

  async pageEvent(callerUserId: string, attemptId: string, dto: PageEventDto) {
    const studentId = await this.requireStudentId(callerUserId);
    const attempt = await this.findOwnedAttemptOrThrow(attemptId, studentId);
    if (attempt.status !== QuizAttemptStatus.IN_PROGRESS) return; // silently no-op

    const existing = Array.isArray(attempt.pageVisibilityEvents)
      ? (attempt.pageVisibilityEvents as unknown[])
      : [];
    const next = [
      ...existing,
      {
        event: dto.event,
        clientTs: dto.ts,
        serverTs: new Date().toISOString(),
      },
    ];
    await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: { pageVisibilityEvents: next as Prisma.InputJsonValue },
    });
  }

  async listMine(
    callerUserId: string,
    query: { quizAssignmentId?: string; page?: number; limit?: number },
  ) {
    const studentId = await this.requireStudentId(callerUserId);
    const where: Prisma.QuizAttemptWhereInput = { studentId };
    if (query.quizAssignmentId) where.quizAssignmentId = query.quizAssignmentId;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.quizAttempt.findMany({
        where,
        orderBy: [{ startedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { quizAssignment: { select: { id: true, showResultsImmediately: true, resultsReleasedAt: true, quiz: { select: { defaultSettings: true } } } } },
      }),
      this.prisma.quizAttempt.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getMine(callerUserId: string, attemptId: string) {
    const studentId = await this.requireStudentId(callerUserId);
    await this.findOwnedAttemptOrThrow(attemptId, studentId);
    return this.fetchView(attemptId, callerUserId);
  }

  // ---------- helpers used by processor / cron ----------

  /** Used by AUTO_SUBMIT_TICK processor to find expired in-progress attempts. */
  /**
   * Returns expired IN_PROGRESS attempts for the auto-submit tick, but only
   * those whose dueAt is within the recovery window (default 24h). Older
   * stuck attempts are handled by `forceSubmitAncientStuckAttempts` so we
   * don't loop on a permanently broken attempt forever.
   */
  async findExpiredInProgressAttempts(now: Date, limit = 100, recoveryWindowMs = 24 * 60 * 60 * 1000) {
    const cutoff = new Date(now.getTime() - recoveryWindowMs);
    return this.prisma.quizAttempt.findMany({
      where: {
        status: QuizAttemptStatus.IN_PROGRESS,
        dueAt: { lt: now, gte: cutoff },
      },
      select: { id: true },
      take: limit,
    });
  }

  /**
   * Force-submits attempts whose dueAt is older than the recovery window and
   * are still IN_PROGRESS — typically because earlier auto-submit attempts
   * raised a permanent error. Bypasses the queued grading path and writes
   * the status directly so the attempt no longer pollutes the tick.
   */
  async forceSubmitAncientStuckAttempts(now: Date, recoveryWindowMs = 24 * 60 * 60 * 1000, limit = 50) {
    const cutoff = new Date(now.getTime() - recoveryWindowMs);
    const ancient = await this.prisma.quizAttempt.findMany({
      where: { status: QuizAttemptStatus.IN_PROGRESS, dueAt: { lt: cutoff } },
      select: { id: true },
      take: limit,
    });
    for (const { id } of ancient) {
      try {
        await this.prisma.quizAttempt.update({
          where: { id },
          data: {
            status: QuizAttemptStatus.SUBMITTED,
            submittedAt: now,
            autoSubmitted: true,
          },
        });
        // Best-effort grading kick — failures here don't requeue.
        await this.queue.enqueueGradeAttempt(id).catch((err) => {
          this.logger.error(`Force-submit grading enqueue failed for ${id}`, err);
        });
        this.logger.warn(`Force-submitted stale attempt ${id} (dueAt > ${recoveryWindowMs}ms ago)`);
      } catch (err) {
        this.logger.error(`Force-submit failed for ${id}`, err);
      }
    }
    return ancient.length;
  }

  async autoSubmitExpired(attemptId: string) {
    await this.markSubmittedAndEnqueue(attemptId, true);
  }

  // ---------- internals ----------

  private async fetchView(attemptId: string, callerUserId: string) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        ...ATTEMPT_DETAIL_INCLUDE,
        quizAssignment: {
          select: {
            id: true,
            quizId: true,
            showResultsImmediately: true,
            showCorrectAnswers: true,
            resultsReleasedAt: true,
            quiz: { select: { id: true, defaultSettings: true } },
          },
        },
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');

    // ownership re-check (fetchView is called from start() too)
    const studentId = await this.requireStudentId(callerUserId);
    if (attempt.studentId !== studentId) {
      throw new ForbiddenException('Not your attempt');
    }

    const { resultsVisible, showCorrectAnswers } = this.resolveVisibility(attempt.quizAssignment);
    return {
      attempt,
      ctx: { resultsVisible, showCorrectAnswers },
      quizId: attempt.quizAssignment.quizId,
    };
  }

  private resolveVisibility(assignment: {
    showResultsImmediately: boolean | null;
    showCorrectAnswers: boolean | null;
    resultsReleasedAt: Date | null;
    quiz: { defaultSettings: unknown };
  }) {
    const settings = (assignment.quiz.defaultSettings ?? {}) as Record<string, unknown>;
    const showResultsImmediately =
      assignment.showResultsImmediately ??
      (typeof settings.showResultsImmediately === 'boolean'
        ? settings.showResultsImmediately
        : false);
    const showCorrectAnswers =
      assignment.showCorrectAnswers ??
      (typeof settings.showCorrectAnswers === 'boolean'
        ? settings.showCorrectAnswers
        : false);
    const resultsVisible = showResultsImmediately || assignment.resultsReleasedAt !== null;
    return { resultsVisible, showCorrectAnswers };
  }

  private async markSubmittedAndEnqueue(attemptId: string, autoSubmitted: boolean) {
    await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: QuizAttemptStatus.SUBMITTED,
        submittedAt: new Date(),
        autoSubmitted,
      },
    });
    try {
      await this.queue.enqueueGradeAttempt(attemptId);
    } catch (queueErr) {
      // Queue down? Fall back to inline grading so the student still gets a result.
      this.logger.error(
        `Failed to enqueue grading for attempt ${attemptId}; grading inline`,
        queueErr,
      );
      try {
        await this.grading.gradeAttempt(attemptId);
      } catch (gradeErr) {
        // Both paths failed. Attempt is SUBMITTED but never graded — mark it
        // so it gets picked up by a future tick or a manual retry rather than
        // being silently stuck without grading data.
        this.logger.error(
          `Inline grading also failed for attempt ${attemptId}; leaving in SUBMITTED for retry`,
          gradeErr,
        );
        // Defensive re-enqueue attempt — best-effort, swallowed if queue still down.
        await this.queue.enqueueGradeAttempt(attemptId).catch(() => undefined);
      }
    }
  }

  private async findOwnedAttemptOrThrow(attemptId: string, studentId: string) {
    const attempt = await this.prisma.quizAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.studentId !== studentId) throw new ForbiddenException('Not your attempt');
    return attempt;
  }

  private async requireStudentId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, type: true, student: { select: { id: true } } },
    });
    if (!user || user.type !== UserTypes.STUDENT || !user.student) {
      throw new ForbiddenException('Only students can use this endpoint');
    }
    return user.student.id;
  }

  private async assertEnrolled(studentId: string, classArmId: string) {
    const enrolment = await this.prisma.classArmStudent.findFirst({
      where: { studentId, classArmId, isActive: true, deletedAt: null },
    });
    if (!enrolment) {
      throw new ForbiddenException('You are not enrolled in this class arm');
    }
  }

  private assertWindowAllowsStart(
    assignment: AssignmentForStart,
    overrides: QuizAttemptOverride[],
    now: Date,
  ) {
    if (assignment.quiz.status !== 'PUBLISHED') {
      throw new BadRequestException('Quiz is no longer available');
    }
    if (now < assignment.windowOpensAt) {
      throw new ConflictException('Window has not opened yet');
    }

    const extended = this.effectiveWindowClosesAt(assignment, overrides);
    if (now >= extended) {
      throw new ConflictException('Window has closed');
    }

    if (assignment.mode === QuizDeliveryMode.SYNC_START) {
      const grace = assignment.syncGracePeriodSeconds ?? 0;
      const lateCutoff = new Date(assignment.windowOpensAt.getTime() + grace * 1000);
      if (now > lateCutoff) {
        throw new ConflictException(
          `Sync-start grace period (${grace}s) elapsed — too late to join`,
        );
      }
    }
  }

  private effectiveMaxAttempts(
    assignment: { maxAttempts: number },
    overrides: QuizAttemptOverride[],
  ): number {
    const extra = overrides
      .filter((o) => o.type === QuizOverrideType.RETRY)
      .reduce((sum, o) => sum + (o.extraAttempts ?? 0), 0);
    return assignment.maxAttempts + extra;
  }

  private effectiveWindowClosesAt(
    assignment: { windowClosesAt: Date },
    overrides: QuizAttemptOverride[],
  ): Date {
    let latest = assignment.windowClosesAt;
    for (const o of overrides) {
      if (o.type === QuizOverrideType.EXTEND_WINDOW && o.newWindowClosesAt) {
        if (o.newWindowClosesAt > latest) latest = o.newWindowClosesAt;
      }
    }
    return latest;
  }

  private computeDueAt(
    assignment: AssignmentForStart,
    overrides: QuizAttemptOverride[],
    now: Date,
  ): Date {
    const extraMs = overrides
      .filter((o) => o.type === QuizOverrideType.EXTRA_TIME)
      .reduce((sum, o) => sum + (o.extraMinutes ?? 0) * 60_000, 0);

    const cap = this.effectiveWindowClosesAt(assignment, overrides);
    const baseMs = assignment.durationMinutes * 60_000;

    let dueAt: Date;
    if (assignment.mode === QuizDeliveryMode.SYNC_START) {
      dueAt = new Date(assignment.windowOpensAt.getTime() + baseMs + extraMs);
    } else {
      dueAt = new Date(now.getTime() + baseMs + extraMs);
    }
    return dueAt < cap ? dueAt : cap;
  }
}

