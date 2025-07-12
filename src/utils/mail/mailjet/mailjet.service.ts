import { BaseService } from '../../../common/base-service';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMailService, SendEmailInputType } from '../types';
import Mailjet from 'node-mailjet';
import { CustomProviderTokensEnum } from '../../../common/types';

@Injectable()
export class MailjetService extends BaseService implements IMailService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(CustomProviderTokensEnum.MAILJET_CLIENT)
    private mailjetClient: Mailjet,
  ) {
    super(MailjetService.name);
  }

  async sendEmail(input: SendEmailInputType) {
    try {
      await this.mailjetClient.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: this.configService.get<string>('mail.defaultEmail'),
              Name: 'Graff Systems',
            },
            To: [
              {
                Email: input.recipientAddress,
                Name: input.recipientName,
              },
            ],
            Subject: input.subject,
            TextPart: input.text,
            HTMLPart: input.html,
          },
        ],
      });
    } catch (err) {
      this.logger.error(err);
      throw new InternalServerErrorException('An error occured');
    }
  }
}
