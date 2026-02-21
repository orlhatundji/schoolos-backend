import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminTeacherController } from './admin-teacher.controller';
import { AdminTeacherService } from './admin-teacher.service';
import { AdminClassroomController } from './admin-classroom.controller';
import { AdminClassroomService } from './admin-classroom.service';
import { DropdownsController } from './admin-dropdowns.controller';
import { DropdownsService } from './dropdowns.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma';
import { CounterModule } from '../../common/counter';
import { Encryptor } from '../../utils/encryptor';
import { PasswordHasher } from '../../utils/hasher';
import { PasswordGenerator } from '../../utils/password/password.generator';
import { MailQueueModule } from '../../utils/mail-queue/mail-queue.module';

@Module({
  imports: [UsersModule, AuthModule, PrismaModule, CounterModule, MailQueueModule],
  controllers: [AdminController, AdminTeacherController, AdminClassroomController, DropdownsController],
  providers: [AdminService, AdminTeacherService, AdminClassroomService, DropdownsService, Encryptor, PasswordHasher, PasswordGenerator],
})
export class AdminModule {}
