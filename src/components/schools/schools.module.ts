import { Module } from '@nestjs/common';
import { SchoolsRepository } from './schools.repository';
import { SchoolsService } from './schools.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { SchoolSignupRepository } from './school-signup/school-signup.repository';
import { SchoolSignupService } from './school-signup/school-signup.service';
import { SchoolSignupController } from './school-signup/school-signup.controller';
import { UsersModule } from '../users/users.module';
import { CounterModule } from '../../common/counter';
import { MailModule } from '../../utils/mail/mail.module';
import { RolesManagerModule } from '../roles-manager';

@Module({
  imports: [PrismaModule, UsersModule, CounterModule, MailModule, RolesManagerModule],
  providers: [SchoolsRepository, SchoolsService, SchoolSignupRepository, SchoolSignupService],
  controllers: [SchoolSignupController],
  exports: [SchoolsService, SchoolSignupService],
})
export class SchoolsModule {}
