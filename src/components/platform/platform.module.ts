import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { SchoolsManagementService } from './services/schools-management.service';
import { SignupApprovalService } from './services/signup-approval.service';
import { ComplaintsService } from './services/complaints.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../../utils/mail/mail.module';
import { Encryptor } from '../../utils/encryptor';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, UsersModule, MailModule, AuthModule],
  controllers: [PlatformController],
  providers: [
    PlatformService,
    SchoolsManagementService,
    SignupApprovalService,
    ComplaintsService,
    Encryptor,
  ],
  exports: [PlatformService, SchoolsManagementService, SignupApprovalService, ComplaintsService],
})
export class PlatformModule {}
