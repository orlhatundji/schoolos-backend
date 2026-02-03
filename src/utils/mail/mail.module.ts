import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { ResendModule } from './resend/resend.module';

@Module({
  imports: [ResendModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
