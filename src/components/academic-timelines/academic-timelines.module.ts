import { Module } from '@nestjs/common';
import {
  AcademicSessionsService,
  AcademicSessionsController,
  AcademicSessionsRepository,
} from './academic-sessions';
import { TermsService, TermsController, TermsRepository } from './terms';
import { PrismaService, PrismaModule } from '../../prisma';

@Module({
  imports: [PrismaModule],
  controllers: [AcademicSessionsController, TermsController],
  providers: [
    PrismaService,
    AcademicSessionsService,
    AcademicSessionsRepository,
    TermsService,
    TermsRepository,
  ],
  exports: [AcademicSessionsService, TermsService],
})
export class AcademicTimelinesModule {}
