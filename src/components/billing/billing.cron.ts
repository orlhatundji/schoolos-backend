import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { BillingService } from './billing.service';

@Injectable()
export class BillingCron {
  private readonly logger = new Logger(BillingCron.name);

  constructor(private readonly billingService: BillingService) {}

  @Cron('0 7 * * *', { timeZone: 'Africa/Lagos' })
  async dailyGenerate(): Promise<void> {
    try {
      const report = await this.billingService.generateForCurrentTerms();
      this.logger.log(`Daily billing cron: ${JSON.stringify(report)}`);
    } catch (err) {
      this.logger.error(
        `Daily billing cron failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
