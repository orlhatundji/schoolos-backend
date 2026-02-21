import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { StudentsRepository } from './students.repository';
import { ClassArmStudentService } from './services/class-arm-student.service';
import { RolesManagerModule } from '../roles-manager';
import { SchoolsModule } from '../schools';
import { CounterModule } from '../../common/counter';
import { PasswordGenerator } from '../../utils/password/password.generator';
import { PasswordHasher } from '../../utils/hasher/hasher';
import { ActivityLogService } from '../../common/services/activity-log.service';
import { MailQueueModule } from '../../utils/mail-queue/mail-queue.module';
import {
  BulkUploadController,
  BulkUploadService,
  TemplateService,
  StudentImportProcessor,
} from './bulk-upload';

@Module({
  imports: [
    UsersModule,
    PrismaModule,
    RolesManagerModule,
    CounterModule,
    SchoolsModule,
    MailQueueModule,
    BullModule.registerQueue({
      name: 'student-import',
    }),
  ],
  controllers: [StudentsController, BulkUploadController],
  providers: [
    StudentsService,
    StudentsRepository,
    ClassArmStudentService,
    PasswordGenerator,
    PasswordHasher,
    ActivityLogService,
    BulkUploadService,
    TemplateService,
    StudentImportProcessor,
  ],
  exports: [StudentsService, BulkUploadService, ClassArmStudentService],
})
export class StudentsModule {}
