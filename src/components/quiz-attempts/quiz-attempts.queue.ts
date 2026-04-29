import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Queue } from 'bullmq';

import {
  AUTO_SUBMIT_TICK_INTERVAL_MS,
  AUTO_SUBMIT_TICK_JOB_ID,
  GradeAttemptJobData,
  QUIZ_ATTEMPTS_QUEUE,
  QuizAttemptsJob,
} from './types';

/**
 * Producer + bootstrap. Schedules the singleton AUTO_SUBMIT_TICK repeatable
 * job at app start so we have one cron tick across the cluster.
 */
@Injectable()
export class QuizAttemptsQueue implements OnApplicationBootstrap {
  private readonly logger = new Logger(QuizAttemptsQueue.name);

  constructor(@InjectQueue(QUIZ_ATTEMPTS_QUEUE) private readonly queue: Queue) {}

  async onApplicationBootstrap() {
    try {
      await this.queue.add(
        QuizAttemptsJob.AUTO_SUBMIT_TICK,
        { scheduledAt: new Date().toISOString() },
        {
          repeat: { every: AUTO_SUBMIT_TICK_INTERVAL_MS },
          jobId: AUTO_SUBMIT_TICK_JOB_ID,
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      );
      this.logger.log(
        `Auto-submit tick scheduled every ${AUTO_SUBMIT_TICK_INTERVAL_MS}ms`,
      );
    } catch (err) {
      this.logger.error('Failed to schedule auto-submit tick', err);
    }
  }

  async enqueueGradeAttempt(attemptId: string) {
    const data: GradeAttemptJobData = { attemptId };
    await this.queue.add(QuizAttemptsJob.GRADE_ATTEMPT, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: 200,
      removeOnFail: 100,
    });
  }
}
