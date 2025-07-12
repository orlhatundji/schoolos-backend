import { Module } from '@nestjs/common';
import { MailjetService } from './mailjet.service';
import { CustomProviderTokensEnum } from '../../../common/types';
import { ConfigService } from '@nestjs/config';
import * as Mailjet from 'node-mailjet';

@Module({
  providers: [
    MailjetService,
    {
      provide: CustomProviderTokensEnum.MAILJET_CLIENT,
      useFactory: (configService: ConfigService) => {
        const mailjetApiKey = configService.get<string>('mail.mailjetApiKey');
        const mailjetSecretKey = configService.get<string>('mail.mailjetSecretKey');
        return Mailjet.Client.apiConnect(mailjetApiKey, mailjetSecretKey);
      },
      inject: [ConfigService],
    },
  ],
  exports: [MailjetService],
})
export class MailjetModule {}
