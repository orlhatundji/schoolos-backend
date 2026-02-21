import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../prisma/prisma.module';
import { ActivityLogModule } from '../../../common/modules/activity-log.module';
import { Encryptor } from '../../../utils/encryptor';
import { JwtAuthModule } from '../../auth/strategies/jwt/jwt-auth.module';
import { RolesManagerModule } from '../../roles-manager/roles-manager.module';
import { UsersModule } from '../../users/users.module';
import { BffAdminController } from './bff-admin.controller';
import { BffAdminService } from './bff-admin.service';
import { BffAdminAdminService } from './services/bff-admin-admin.service';
import { BffAdminClassroomService } from './services/bff-admin-classroom.service';
import { BffAdminDepartmentService } from './services/bff-admin-department.service';
import { BffAdminLevelService } from './services/bff-admin-level.service';
import { BffAdminStudentService } from './services/bff-admin-student.service';
import { BffAdminSubjectService } from './services/bff-admin-subject.service';
import { BffAdminTeacherService } from './services/bff-admin-teacher.service';
import { AssessmentStructureTemplateService } from '../../assessment-structures/assessment-structure-template.service';
import { ClassroomBroadsheetBuilder } from '../../../utils/classroom-broadsheet.util';

@Module({
  imports: [PrismaModule, ActivityLogModule, UsersModule, RolesManagerModule, JwtAuthModule],
  controllers: [BffAdminController],
  providers: [
    BffAdminService,
    BffAdminTeacherService,
    BffAdminStudentService,
    BffAdminSubjectService,
    BffAdminDepartmentService,
    BffAdminLevelService,
    BffAdminClassroomService,
    BffAdminAdminService,
    AssessmentStructureTemplateService,
    ClassroomBroadsheetBuilder,
    Encryptor,
  ],
})
export class BffAdminModule {}
