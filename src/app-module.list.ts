import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import * as dotenv from 'dotenv';
import { getEnvFileName } from './config/get-env';
import { ConfigValidationSchema } from './config/validation.schema';
import getConfiguration from './config/configuration';
import { StudentsModule } from './components/students/students.module';
import { AuthModule } from './components/auth/auth.module';
import { RolesManagerModule } from './components/roles-manager';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './components/admin/admin.module';
import { AcademicTimelinesModule } from './components/academic-timelines/academic-timelines.module';
import { AssessmentsModule } from './components/assessments/assessments.module';
import { TerminusModule } from '@nestjs/terminus';
import { SchoolsModule } from './components/schools/schools.module';
import { UsersModule } from './components/users/users.module';
import { BffAdminModule } from './components/bff/admin/bff-admin.module';
import { SubjectsModule } from './components/subjects/subjects.module';
import { DepartmentsModule } from './components/departments/departments.module';
import { LevelsModule } from './components/levels/levels.module';
import { MailModule } from './utils/mail/mail.module';
import { MailQueueModule } from './utils/mail-queue/mail-queue.module';
import { PaymentsModule } from './components/payments/payments.module';

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
  SubjectsModule,
  DepartmentsModule,
  LevelsModule,
  TerminusModule,
  AssessmentsModule,
  PaymentsModule,
];
