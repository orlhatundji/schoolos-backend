import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailjetModule } from './mailjet/mailjet.module';

@Module({
  imports: [MailjetModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
