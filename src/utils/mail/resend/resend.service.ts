import { BaseService } from '../../../common/base-service';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IMailService, SendEmailInputType } from '../types';
import { Resend } from 'resend';
import { CustomProviderTokensEnum } from '../../../common/types';

@Injectable()
export class ResendService extends BaseService implements IMailService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(CustomProviderTokensEnum.RESEND_CLIENT)
    private resendClient: Resend,
  ) {
    super(ResendService.name);
  }

  async sendEmail(input: SendEmailInputType) {
    const response = await this.resendClient.emails.send({
      from: this.configService.get<string>('mail.defaultEmail'),
      to: [input.recipientAddress],
      subject: input.subject,
      html: input.html,
    });

    if (response.error) {
      this.logger.error(response);
      throw new InternalServerErrorException('An error occured');
    }
  }

  private _getFromEmail() {
    return this.configService.get<string>('mail.defaultEmail');
  }
}
