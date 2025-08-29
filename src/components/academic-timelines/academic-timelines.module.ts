import { Module } from '@nestjs/common';

import { PrismaModule, PrismaService } from '../../prisma';
import { Encryptor } from '../../utils/encryptor';
import { AuthModule } from '../auth/auth.module';
import { RolesManagerModule } from '../roles-manager/roles-manager.module';
import {
  AcademicCalendarController,
  AcademicCalendarRepository,
  AcademicCalendarService,
} from './academic-calendar';
import {
  AcademicSessionsController,
  AcademicSessionsRepository,
  AcademicSessionsService,
} from './academic-sessions';
import { TermsController, TermsRepository, TermsService } from './terms';

@Module({
  imports: [PrismaModule, AuthModule, RolesManagerModule],
  controllers: [AcademicSessionsController, TermsController, AcademicCalendarController],
  providers: [
    PrismaService,
    AcademicSessionsService,
    AcademicSessionsRepository,
    TermsService,
    TermsRepository,
    AcademicCalendarService,
    AcademicCalendarRepository,
    Encryptor,
  ],
  exports: [AcademicSessionsService, TermsService, AcademicCalendarService],
})
export class AcademicTimelinesModule {}
