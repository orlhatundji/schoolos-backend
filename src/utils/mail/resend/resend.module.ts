import { Module } from '@nestjs/common';
import { ResendService } from './resend.service';
import { CustomProviderTokensEnum } from '../../../common/types';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Module({
  providers: [
    ResendService,
    {
      provide: CustomProviderTokensEnum.RESEND_CLIENT,
      useFactory: (configService: ConfigService) => {
        return new Resend(configService.get<string>('mail.resendApiKey'));
      },
      inject: [ConfigService],
    },
  ],
  exports: [ResendService],
})
export class ResendModule {}
