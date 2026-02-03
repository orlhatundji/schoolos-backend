import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators';
import { MailService } from './utils/mail/mail.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly mailService: MailService,
  ) {}

  @Get()
  @Public()
  getHello() {
    return this.appService.getHello();
  }

  @Post('test-mail')
  @Public()
  async testMail(
    @Body()
    body: {
      recipientAddress: string;
      recipientName?: string;
      subject?: string;
      html?: string;
    },
  ) {
    try {
      await this.mailService.sendEmail({
        recipientAddress: body.recipientAddress,
        recipientName: body.recipientName || 'Test User',
        subject: body.subject || 'Test Email',
        html:
          body.html ||
          '<h1>Test Email</h1><p>This is a test email from the SchoolOS backend.</p>',
      });

      return {
        success: true,
        message: 'Email sent successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send email',
        error: error.message,
      };
    }
  }
}
