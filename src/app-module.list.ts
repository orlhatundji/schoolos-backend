import { ConfigModule, ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './components/auth/auth.module';
import { RolesManagerModule } from './components/roles-manager';
import { StudentsModule } from './components/students/students.module';
import { UsersModule } from './components/users/users.module';
import { getEnvFileName, ConfigValidationSchema } from './config';
import getConfiguration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './components/admin/admin.module';
import { AcademicTimelinesModule } from './components/academic-timelines';
import { TerminusModule } from '@nestjs/terminus';
import { SchoolsModule } from './components/schools';
import { AssessmentStructureModule } from './components/assessments/assessment-structure.module';

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
  AssessmentStructureModule,
];
