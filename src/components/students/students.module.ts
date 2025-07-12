import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { StudentsRepository } from './students.repository';
import { RolesManagerModule } from '../roles-manager';
import { SchoolsModule } from '../schools';
import { CounterModule } from '../../common/counter';

@Module({
  imports: [UsersModule, PrismaModule, RolesManagerModule, CounterModule, SchoolsModule],
  controllers: [StudentsController],
  providers: [StudentsService, StudentsRepository],
  exports: [StudentsService],
})
export class StudentsModule {}
