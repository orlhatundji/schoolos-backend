import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthMessages } from '../../src/components/auth/results';
import { Faker } from '../helper';
import { PasswordValidator } from '../../src/utils/password';
import { CreateStudentDto } from '../../src/components/students/dto';
import { getUserTokens } from '../helper/auth.helper';
import { generateFullSchoolSetup } from '../helper/generators';
import { UserTypes } from '../../src/components/users/constants';
import { Student } from '../../src/components/students/types';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let studentPayload: CreateStudentDto;
  let faker: Faker;
  let student: Student;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    faker = new Faker();

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
      admissionNo: faker.getAdmissionNo(),
      admissionDate: faker.getAdmissionDate(),
    };
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a new student (201)', async () => {
    const { accessToken } = await getUserTokens(app, 'SUPER_ADMIN');
    const response = await request(app.getHttpServer())
      .post('/students')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(studentPayload)
      .expect(201);

    student = response.body.data;

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

  it('should login a student (200)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/student/login')
      .send({
        studentNo: student.studentNo,
        password: studentPayload.password,
      })
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('tokens');
    expect(response.body.data.tokens).toHaveProperty('accessToken');
    expect(response.body.data.tokens).toHaveProperty('refreshToken');
  });

  it('should return 401 for wrong student password', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/student/login')
      .send({
        studentNo: student.studentNo,
        password: studentPayload.password + 'wrong',
      })
      .expect(401);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe(AuthMessages.FAILURE.ACCESS_DENIED);
  });

  it('should return 401 for wrong studentNo', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/student/login')
      .send({
        studentNo: faker.getStudentNo(),
        password: studentPayload.password + 'wrong',
      })
      .expect(401);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe(AuthMessages.FAILURE.ACCESS_DENIED);
  });

  it('should return 400 for missing studentNo', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/student/login')
      .send({
        password: studentPayload.password,
      })
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('studentNo must be a string');
    expect(response.body.message).toContain(
      'studentNo must be longer than or equal to 2 characters',
    );
  });

  it('should return 400 for invalid studentNo format', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/student/login')
      .send({
        studentNo: 'a',
        password: studentPayload.password,
      })
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain(
      'studentNo must be longer than or equal to 2 characters',
    );
  });

  it('should return 400 for missing password', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/student/login')
      .send({
        studentNo: student.studentNo,
      })
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('password must be a string');
    expect(response.body.message).toContain(PasswordValidator.ValidationErrorMessage);
  });
});
