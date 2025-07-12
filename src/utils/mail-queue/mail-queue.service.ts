import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { BaseService } from '../../common/base-service';
import { SendEmailInputType } from '../mail/types';
import { MAIL_QUEUE, MailQueueJobs } from './types';

@Injectable()
export class MailQueueService extends BaseService {
  constructor(@InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue) {
    super(MailQueueService.name);
  }

  async add(body: SendEmailInputType) {
    await this.mailQueue.add(MailQueueJobs.SEND_MAIL, body, { attempts: 3 });
  }
}
