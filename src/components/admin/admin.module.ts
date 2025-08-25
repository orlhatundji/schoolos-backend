import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { DropdownsController } from './admin-dropdowns.controller';
import { DropdownsService } from './dropdowns.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma';
import { Encryptor } from '../../utils/encryptor';

@Module({
  imports: [UsersModule, AuthModule, PrismaModule],
  controllers: [AdminController, DropdownsController],
  providers: [AdminService, DropdownsService, Encryptor],
})
export class AdminModule {}
