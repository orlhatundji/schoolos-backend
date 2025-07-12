import { Injectable } from '@nestjs/common';
import { IMailService, SendEmailInputType } from './types';
import { BaseService } from '../../common/base-service';
import { MailjetService } from './mailjet/mailjet.service';

@Injectable()
export class MailService extends BaseService implements IMailService {
  constructor(private readonly _mailerService: MailjetService) {
    super(MailService.name);
  }

  public async sendEmail(emailInfo: SendEmailInputType) {
    return await this._mailerService.sendEmail(emailInfo);
  }
}
