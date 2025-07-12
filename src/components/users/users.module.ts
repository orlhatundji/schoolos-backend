import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PasswordHasher } from '../../utils/hasher';
import { UsersRepository } from './users.repository';
import { RolesManagerModule } from '../roles-manager';

@Module({
  imports: [PrismaModule, RolesManagerModule],
  providers: [UsersService, UsersRepository, PasswordHasher],
  controllers: [UsersController],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
