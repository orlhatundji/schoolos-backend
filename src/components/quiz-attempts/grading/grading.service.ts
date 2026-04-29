import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, QuizAttemptStatus } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { gradeResponse } from './graders';

@Injectable()
export class GradingService {
  private readonly logger = new Logger(GradingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Grades every QuestionResponse on an attempt and rolls up totalScore /
   * percentage / status. Idempotent — calling it on an already-GRADED
   * attempt re-runs grading (useful if a question's correctness was
   * corrected after the fact, though in v1 we never do that).
   */
  async gradeAttempt(attemptId: string): Promise<void> {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        responses: {
          include: {
            question: {
              select: {
                id: true,
                type: true,
                config: true,
                partialCreditMode: true,
                options: { select: { id: true, isCorrect: true } },
              },
            },
          },
        },
      },
    });
    if (!attempt) throw new NotFoundException(`QuizAttempt ${attemptId} not found`);

    if (
      attempt.status !== QuizAttemptStatus.SUBMITTED &&
      attempt.status !== QuizAttemptStatus.GRADING &&
      attempt.status !== QuizAttemptStatus.GRADED
    ) {
      this.logger.warn(
        `Skipping grade for attempt ${attemptId}: status=${attempt.status} (expected SUBMITTED/GRADING/GRADED)`,
      );
      return;
    }

    await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: { status: QuizAttemptStatus.GRADING },
    });

    let totalScore = 0;
    const updates: Array<Promise<unknown>> = [];

    for (const response of attempt.responses) {
      const fraction = gradeResponse(response.responseJson, {
        type: response.question.type,
        options: response.question.options,
        config: response.question.config as Record<string, unknown> | null,
        partialCreditMode: response.question.partialCreditMode,
      });
      const weight = Number(response.weight.toString());
      const pointsAwarded = +(weight * fraction).toFixed(2);
      totalScore += pointsAwarded;

      updates.push(
        this.prisma.questionResponse.update({
          where: { id: response.id },
          data: {
            pointsAwarded,
            isCorrect: fraction === 1,
            autoGraded: true,
          },
        }),
      );
    }

    await Promise.all(updates);

    const maxScore = Number(attempt.maxScore.toString());
    const percentage = maxScore > 0 ? +((totalScore / maxScore) * 100).toFixed(2) : 0;

    await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        totalScore: new Prisma.Decimal(totalScore.toFixed(2)),
        percentage: new Prisma.Decimal(percentage.toFixed(2)),
        status: QuizAttemptStatus.GRADED,
      },
    });

    this.logger.log(
      `Graded attempt ${attemptId}: ${totalScore}/${maxScore} (${percentage}%)`,
    );
  }
}
