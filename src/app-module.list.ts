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
  UsersModule,
  SchoolsModule,
  StudentsModule,
  AuthModule,
  AcademicTimelinesModule,
  RolesManagerModule,
  AdminModule,
  TerminusModule,
  AssessmentsModule,
];
