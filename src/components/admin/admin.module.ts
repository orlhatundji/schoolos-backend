import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminTeacherController } from './admin-teacher.controller';
import { AdminTeacherService } from './admin-teacher.service';
import { DropdownsController } from './admin-dropdowns.controller';
import { DropdownsService } from './dropdowns.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma';
import { Encryptor } from '../../utils/encryptor';
import { PasswordHasher } from '../../utils/hasher';

@Module({
  imports: [UsersModule, AuthModule, PrismaModule],
  controllers: [AdminController, AdminTeacherController, DropdownsController],
  providers: [AdminService, AdminTeacherService, DropdownsService, Encryptor, PasswordHasher],
})
export class AdminModule {}
