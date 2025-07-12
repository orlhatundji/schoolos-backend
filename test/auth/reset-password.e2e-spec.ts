import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { ResetPasswordMessages } from '../../src/components/auth/modules/reset-password/results/messages';
import { getUserTokens } from '../helper/auth.helper';
import { MailService } from '../../src/utils/mail/mail.service';
import { User } from '@prisma/client';
import { generateFullSchoolSetup, generateUser } from '../helper/generators';
import TestAgent from 'supertest/lib/agent';

jest.mock('../../src/utils/mail/mail.service');

const mockMailService = { sendEmail: jest.fn() };

describe('Reset Password (e2e)', () => {
  let app: INestApplication;
  let server: TestAgent<request.Test>;
  let user: User;
  let resetToken: string;
  const newPassword = 'NewStrongPassword1!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mockMailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    server = request(app.getHttpServer());

    const { school } = await generateFullSchoolSetup();
    ({ user } = await generateUser('TEACHER', school.id));
  });

  afterAll(() => app.close());

  describe('Requesting a reset link', () => {
    it('responds 200 and sends email', async () => {
      const { body } = await server
        .post('/reset-password/request')
        .send({ email: user.email })
        .expect(200);

      expect(body.message).toBe(ResetPasswordMessages.SUCCESS.SENT_RESET_PASSWORD_LINK);
      expect(mockMailService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('Admin resets user password', () => {
    let accessToken: string;

    beforeAll(async () => {
      ({ accessToken } = await getUserTokens(app, 'SUPER_ADMIN'));
    });

    it('responds 200 with a defaultPassword', async () => {
      const { body } = await server
        .post('/admin/reset-user-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: user.email })
        .expect(200);

      expect(body.message).toBe(ResetPasswordMessages.SUCCESS.PASSWORD_RESET_FOR_USER);
      expect(body).toHaveProperty('defaultPassword');
      resetToken = body.defaultPassword;
    });
  });

  describe('Updating the password', () => {
    it('succeeds with valid token (200)', async () => {
      const { body } = await server
        .post('/reset-password/update')
        .send({ email: user.email, token: resetToken, password: newPassword })
        .expect(200);

      expect(body.message).toBe(ResetPasswordMessages.SUCCESS.PASSWORD_UPDATED);
    });

    it('fails with invalid token (400)', async () => {
      const { body } = await server
        .post('/reset-password/update')
        .send({ email: user.email, token: 'invalid-token', password: newPassword })
        .expect(400);

      expect(body.message).toBe(ResetPasswordMessages.FAILURE.RESET_LINK_EXPIRED);
    });
  });
});
