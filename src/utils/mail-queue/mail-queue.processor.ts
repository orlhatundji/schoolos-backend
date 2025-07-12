import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from '../mail/mail.service';
import { SendEmailInputType } from '../mail/types';
import { MAIL_QUEUE } from './types';

@Processor(MAIL_QUEUE)
export class MailQueueProcessor extends WorkerHost {
  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<unknown> & { data: SendEmailInputType }) {
    return await this.mailService.sendEmail(job.data);
  }
}
