import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthMessages } from '../../src/components/auth/results';
import { Faker } from '../helper';
import { CreateUserDto } from '../../src/components/users/dto';
import { getUserTokens } from '../helper/auth.helper';
import { FORBIDDEN_MESSAGE } from '@nestjs/core/guards';
import { UserTypes } from '../../src/components/users/constants';
import { UserType } from '@prisma/client';
import { generateFullSchoolSetup } from '../../test/helper/generators';
import { PasswordValidator } from '../../src/utils/password';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let userPayload: CreateUserDto;
  let faker: Faker;

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

  beforeAll(async () => {
    faker = new Faker();

    const { school } = await generateFullSchoolSetup();
    userPayload = {
      type: UserTypes.STUDENT,
      schoolId: school.id,
      firstName: faker.getFirstName(),
      lastName: faker.getLastName(),
      password: faker.getStrongPassword(),
      dateOfBirth: faker.getDOB(),
      avatarUrl: faker.getURL(),
      address: faker.getAddress(),
      email: faker.getEmail(),
      phone: faker.getPhoneNumber(),
    };
  });

  const userTypes: UserType[] = ['STUDENT', 'TEACHER', 'GUARDIAN'];

  userTypes.forEach((userType) => {
    it(`should return 403 Forbidden when ${userType} tries to create a user`, async () => {
      const { accessToken } = await getUserTokens(app, userType);

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(userPayload)
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe(FORBIDDEN_MESSAGE);
    });
  });

  it('should allow a super admin to create a new user (201)', async () => {
    const { accessToken } = await getUserTokens(app, 'SUPER_ADMIN');
    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(userPayload)
      .expect(201);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data.email).toEqual(userPayload.email);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('createdAt');
    expect(response.body.data).toHaveProperty('updatedAt');
  });

  it('should login a user (200)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: userPayload.email,
        password: userPayload.password,
      })
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('tokens');
    expect(response.body.data.tokens).toHaveProperty('accessToken');
    expect(response.body.data.tokens).toHaveProperty('refreshToken');
  });

  it('should return 401 for wrong user password', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: userPayload.email,
        password: userPayload.password + 'wrong',
      })
      .expect(401);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe(AuthMessages.FAILURE.ACCESS_DENIED);
  });

  it('should return 401 for wrong user email', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: faker.getEmail(),
        password: userPayload.password,
      })
      .expect(401);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe(AuthMessages.FAILURE.ACCESS_DENIED);
  });

  it('should return 400 for invalid email format', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'invalid-email',
        password: userPayload.password,
      })
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('email must be an email');
  });

  it('should return 400 for missing password', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: userPayload.email,
      })
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('password must be a string');
    expect(response.body.message).toContain(PasswordValidator.ValidationErrorMessage);
  });
});
