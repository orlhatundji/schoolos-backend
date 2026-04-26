import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { GradingService } from '../grading/grading.service';
import { QuizAttemptsService } from '../quiz-attempts.service';
import {
  GradeAttemptJobData,
  QUIZ_ATTEMPTS_QUEUE,
  QuizAttemptsJob,
} from '../types';

@Processor(QUIZ_ATTEMPTS_QUEUE)
export class QuizAttemptsProcessor extends WorkerHost {
  private readonly logger = new Logger(QuizAttemptsProcessor.name);

  constructor(
    private readonly grading: GradingService,
    private readonly attempts: QuizAttemptsService,
  ) {
    super();
  }

  async process(job: Job<unknown>) {
    switch (job.name) {
      case QuizAttemptsJob.GRADE_ATTEMPT:
        return this.handleGradeAttempt(job as Job<GradeAttemptJobData>);
      case QuizAttemptsJob.AUTO_SUBMIT_TICK:
        return this.handleAutoSubmitTick();
      default:
        this.logger.warn(`Unknown job: ${job.name}`);
        return undefined;
    }
  }

  private async handleGradeAttempt(job: Job<GradeAttemptJobData>) {
    const { attemptId } = job.data;
    await this.grading.gradeAttempt(attemptId);
  }

  private async handleAutoSubmitTick() {
    const now = new Date();
    const expired = await this.attempts.findExpiredInProgressAttempts(now, 100);
    if (expired.length === 0) return;
    this.logger.log(`Auto-submitting ${expired.length} expired attempts`);
    for (const { id } of expired) {
      try {
        await this.attempts.autoSubmitExpired(id);
      } catch (err) {
        this.logger.error(`Auto-submit failed for ${id}`, err);
      }
    }
  }
}
