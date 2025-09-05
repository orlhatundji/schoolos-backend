import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { StudentsRepository } from './students.repository';
import { RolesManagerModule } from '../roles-manager';
import { SchoolsModule } from '../schools';
import { CounterModule } from '../../common/counter';
import { PasswordGenerator } from '../../utils/password/password.generator';
import { PasswordHasher } from '../../utils/hasher/hasher';

@Module({
  imports: [UsersModule, PrismaModule, RolesManagerModule, CounterModule, SchoolsModule],
  controllers: [StudentsController],
  providers: [StudentsService, StudentsRepository, PasswordGenerator, PasswordHasher],
  exports: [StudentsService],
})
export class StudentsModule {}
