import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MAIL_QUEUE } from './types';
import { MailQueueProcessor } from './mail-queue.processor';
import { MailQueueService } from './mail-queue.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MailModule,
    BullModule.registerQueue({
      name: MAIL_QUEUE,
    }),
  ],
  providers: [MailQueueService, MailQueueProcessor],
  exports: [MailQueueService],
})
export class MailQueueModule {}
