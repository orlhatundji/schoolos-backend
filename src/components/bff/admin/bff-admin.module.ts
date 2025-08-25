import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../prisma/prisma.module';
import { Encryptor } from '../../../utils/encryptor';
import { JwtAuthModule } from '../../auth/strategies/jwt/jwt-auth.module';
import { RolesManagerModule } from '../../roles-manager/roles-manager.module';
import { UsersModule } from '../../users/users.module';
import { BffAdminController } from './bff-admin.controller';
import { BffAdminService } from './bff-admin.service';
import { BffAdminClassroomService } from './services/bff-admin-classroom.service';
import { BffAdminStudentService } from './services/bff-admin-student.service';
import { BffAdminTeacherService } from './services/bff-admin-teacher.service';

@Module({
  imports: [PrismaModule, UsersModule, RolesManagerModule, JwtAuthModule],
  controllers: [BffAdminController],
  providers: [
    BffAdminService,
    BffAdminTeacherService,
    BffAdminStudentService,
    BffAdminClassroomService,
    Encryptor,
  ],
})
export class BffAdminModule {}
