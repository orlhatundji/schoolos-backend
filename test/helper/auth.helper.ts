import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { generateFullSchoolSetup, generateSchool, generateUser } from './generators';
import { UserType } from '@prisma/client';

const userLoginEndpointMap: Record<UserType, string> = {
  SUPER_ADMIN: '/auth/login',
  ADMIN: '/auth/login',
  TEACHER: '/auth/login',
  GUARDIAN: '/auth/login',
  STUDENT: '/auth/student/login',
  SYSTEM_ADMIN: '/auth/login',
};

export async function getUserTokens(app: INestApplication, userType: UserType) {
  let payload = null;
  if (userType === 'STUDENT') {
    const {
      student: { studentNo },
      studentUser: { rawPassword },
    } = await generateFullSchoolSetup();

    payload = {
      studentNo,
      password: rawPassword,
    };
  } else {
    const school = await generateSchool();
    const { user, rawPassword } = await generateUser(userType, school.id);
    payload = {
      email: user.email,
      password: rawPassword,
    };
  }

  const endpoint = userLoginEndpointMap[userType];

  if (!payload || !endpoint) {
    throw new Error(`Invalid user type: ${userType}`);
  }

  const response = await request(app.getHttpServer()).post(endpoint).send(payload).expect(200);

  if (!response?.body?.data?.tokens) {
    throw new Error(`Error occurred logging in ${userType}`);
  }

  return response.body.data.tokens;
}
