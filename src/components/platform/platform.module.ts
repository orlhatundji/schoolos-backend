import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';
import { PasswordHasher } from '../../utils/hasher/hasher';
import { MailModule } from '../../utils/mail/mail.module';
import { PasswordGenerator } from '../../utils/password/password.generator';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { CounterModule } from '../../common/counter/counter.module';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { ComplaintsService } from './services/complaints.service';
import { PlatformBootstrapService } from './services/platform-bootstrap.service';
import { SchoolsManagementService } from './services/schools-management.service';
import { SignupApprovalService } from './services/signup-approval.service';

@Module({
  imports: [PrismaModule, UsersModule, MailModule, AuthModule, CounterModule],
  controllers: [PlatformController],
  providers: [
    PlatformService,
    PlatformBootstrapService,
    SchoolsManagementService,
    SignupApprovalService,
    ComplaintsService,
    Encryptor,
    PasswordGenerator,
    PasswordHasher,
  ],
  exports: [PlatformService, SchoolsManagementService, SignupApprovalService, ComplaintsService],
})
export class PlatformModule {}
