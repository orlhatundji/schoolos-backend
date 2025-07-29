import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Faker } from './helper';
import { getUserTokens } from './helper/auth.helper';
import { UserMessages } from '../src/components/users/results';
import { StudentMessages } from '../src/components/students/results';
import { generateFullSchoolSetup } from './helper/generators';
import { CreateStudentDto } from '../src/components/students/dto';
import { UserTypes } from '../src/components/users/constants';

describe('Students (e2e)', () => {
  const faker = new Faker();
  let app: INestApplication;
  let superAdminAccessToken = '';
  let studentPayload: CreateStudentDto;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    const { accessToken } = await getUserTokens(app, UserTypes.SUPER_ADMIN);
    superAdminAccessToken = accessToken;

    const { school, classArm, guardian } = await generateFullSchoolSetup();

    studentPayload = {
      type: UserTypes.STUDENT,
      schoolId: school.id,
      firstName: faker.getFirstName(),
      lastName: faker.getLastName(),
      password: faker.getStrongPassword(),
      dateOfBirth: faker.getDOB(),
      avatarUrl: faker.getURL(),
      email: faker.getEmail(),
      phone: faker.getPhoneNumber(),
      classArmId: classArm.id,
      guardianId: guardian.id,
      admissionDate: faker.getAdmissionDate(),
      admissionNo: faker.getAdmissionNo(),
    };
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a new student (201)', async () => {
    const response = await request(app.getHttpServer())
      .post('/students')
      .set('Authorization', `Bearer ${superAdminAccessToken}`)
      .send(studentPayload)
      .expect(201);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('studentNo');
    expect(response.body.data.guardianId).toEqual(studentPayload.guardianId);
    expect(response.body.data.classArmId).toEqual(studentPayload.classArmId);
    expect(response.body.data.admissionNo).toEqual(studentPayload.admissionNo);
    expect(response.body.data.firstName).toEqual(studentPayload.firstName);
    expect(response.body.data.lastName).toEqual(studentPayload.lastName);
    expect(response.body.data.email).toEqual(studentPayload.email);
    expect(response.body.data.phone).toEqual(studentPayload.phone);
    expect(response.body.data.avatarUrl).toEqual(studentPayload.avatarUrl);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('createdAt');
    expect(response.body.data).toHaveProperty('updatedAt');
  });

  it('should return 400 when creating student with existing email', async () => {
    const payload = {
      ...studentPayload,
      phone: faker.getPhoneNumber(),
      admissionNo: faker.getAdmissionNo(),
    };

    const response = await request(app.getHttpServer())
      .post('/students')
      .set('Authorization', `Bearer ${superAdminAccessToken}`)
      .send(payload)
      .expect(400);

    expect(response.body.message).toBe(UserMessages.FAILURE.USER_EXISTS);
  });

  it('should return 400 when creating student with existing phone number', async () => {
    const payload = {
      ...studentPayload,
      email: faker.getEmail(),
      admissionNo: faker.getAdmissionNo(),
    };

    const response = await request(app.getHttpServer())
      .post('/students')
      .set('Authorization', `Bearer ${superAdminAccessToken}`)
      .send(payload)
      .expect(400);

    expect(response.body.message).toBe(UserMessages.FAILURE.USER_EXISTS);
  });

  it('should return 400 when creating student with existing admission No.', async () => {
    const payload = {
      ...studentPayload,
      phone: faker.getPhoneNumber(),
      email: faker.getEmail(),
    };

    const response = await request(app.getHttpServer())
      .post('/students')
      .set('Authorization', `Bearer ${superAdminAccessToken}`)
      .send(payload)
      .expect(400);

    expect(response.body.message).toBe(StudentMessages.FAILURE.STUDENT_ADMISSION_NO_EXISTS);
  });

  it('should return 400 when required fields are missing', async () => {
    const response = await request(app.getHttpServer())
      .post('/students')
      .set('Authorization', `Bearer ${superAdminAccessToken}`)
      .send({})
      .expect(400);

    expect(response.body.message).toContain('firstName must be a string');
    expect(response.body.message).toContain('lastName must be a string');
    expect(response.body.message).toContain('password must be a string');
  });

  it('should return 400 for invalid email', async () => {
    const payload = { ...studentPayload, email: 'invalid-email' };

    const response = await request(app.getHttpServer())
      .post('/students')
      .set('Authorization', `Bearer ${superAdminAccessToken}`)
      .send(payload)
      .expect(400);

    expect(response.body.message).toContain('email must be an email');
  });

  it('should return 400 for invalid phone', async () => {
    const payload = { ...studentPayload, phone: 'not-a-number' };

    const response = await request(app.getHttpServer())
      .post('/students')
      .set('Authorization', `Bearer ${superAdminAccessToken}`)
      .send(payload)
      .expect(400);

    expect(response.body.message).toContain('phone must be a phone number');
  });

  it('should return 400 for invalid date format', async () => {
    const payload = { ...studentPayload, dateOfBirth: 'not-a-date' };

    const response = await request(app.getHttpServer())
      .post('/students')
      .set('Authorization', `Bearer ${superAdminAccessToken}`)
      .send(payload)
      .expect(400);

    expect(response.body.message).toContain('dateOfBirth must be a valid ISO 8601 date string');
  });
});
