import { Module } from '@nestjs/common';
import {
  AcademicSessionsService,
  AcademicSessionsController,
  AcademicSessionsRepository,
} from './academic-sessions';
import { TermsService, TermsController, TermsRepository } from './terms';
import { PrismaService, PrismaModule } from '../../prisma';
import { AuthModule } from '../auth/auth.module';
import { RolesManagerModule } from '../roles-manager/roles-manager.module';
import { Encryptor } from '../../utils/encryptor';

@Module({
  imports: [PrismaModule, AuthModule, RolesManagerModule],
  controllers: [AcademicSessionsController, TermsController],
  providers: [
    PrismaService,
    AcademicSessionsService,
    AcademicSessionsRepository,
    TermsService,
    TermsRepository,
    Encryptor,
  ],
  exports: [AcademicSessionsService, TermsService],
})
export class AcademicTimelinesModule {}
