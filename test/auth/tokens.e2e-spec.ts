import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthMessages } from '../../src/components/auth/results';
import { getUserTokens } from '../helper/auth.helper';

describe('Tokens (e2e)', () => {
  let app: INestApplication;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should refresh tokens (200)', async () => {
    const tokens = await getUserTokens(app, 'TEACHER');
    refreshToken = tokens.refreshToken;

    const response = await request(app.getHttpServer())
      .post('/tokens/refresh')
      .set('Authorization', `Bearer ${refreshToken}`)
      .send({ refreshToken })
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('tokens');
    expect(response.body.data.tokens).toHaveProperty('accessToken');
    expect(response.body.data.tokens).toHaveProperty('refreshToken');

    refreshToken = response.body.data.tokens.refreshToken;
  });

  it('should blacklist a token (200)', async () => {
    const response = await request(app.getHttpServer())
      .post('/tokens/blacklist')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe(AuthMessages.SUCCESS.TOKEN_BLACKLISTED);

    const response2 = await request(app.getHttpServer())
      .post('/tokens/refresh')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(401);

    expect(response2.body).toHaveProperty('message');
    expect(response2.body.message).toBe(AuthMessages.FAILURE.ACCESS_DENIED);
  });
});
