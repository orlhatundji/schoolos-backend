import * as dotenv from 'dotenv';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule } from '@nestjs/throttler';

import { AcademicTimelinesModule } from './components/academic-timelines/academic-timelines.module';
import { AdminModule } from './components/admin/admin.module';
import { AssessmentStructuresModule } from './components/assessment-structures/assessment-structures.module';
import { AssessmentsModule } from './components/assessments/assessments.module';
import { AuthModule } from './components/auth/auth.module';
import { BffAdminModule } from './components/bff/admin/bff-admin.module';
import { TeacherModule } from './components/bff/teacher/teacher.module';
import { DepartmentsModule } from './components/departments/departments.module';
import { LevelsModule } from './components/levels/levels.module';
import { PaymentsModule } from './components/payments/payments.module';
import { RolesManagerModule } from './components/roles-manager';
import { SchoolsModule } from './components/schools/schools.module';
import { StudentsModule } from './components/students/students.module';
import { SubjectsModule } from './components/subjects/subjects.module';
import { UsersModule } from './components/users/users.module';
import getConfiguration from './config/configuration';
import { getEnvFileName } from './config/get-env';
import { ConfigValidationSchema } from './config/validation.schema';
import { PrismaModule } from './prisma/prisma.module';
import { MailQueueModule } from './utils/mail-queue/mail-queue.module';
import { MailModule } from './utils/mail/mail.module';

dotenv.config({ path: getEnvFileName(), override: true });

export const AppModuleList = [
  ConfigModule.forRoot({
    ignoreEnvFile: true,
    isGlobal: true,
    load: [getConfiguration],
    validationSchema: ConfigValidationSchema,
  }),
  ThrottlerModule.forRootAsync({
    imports: [ConfigModule],
    useFactory: async (configService: ConfigService) => [
      {
        ttl: configService.get<number>('throttler.ttl'),
        limit: configService.get<number>('throttler.limit'),
      },
    ],
    inject: [ConfigService],
  }),
  PrismaModule,
  MailModule,
  MailQueueModule,
  UsersModule,
  SchoolsModule,
  StudentsModule,
  AuthModule,
  AcademicTimelinesModule,
  RolesManagerModule,
  AdminModule,
  BffAdminModule,
  TeacherModule,
  SubjectsModule,
  DepartmentsModule,
  LevelsModule,
  TerminusModule,
  AssessmentsModule,
  AssessmentStructuresModule,
  PaymentsModule,
];
