import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma';
import { TeachersService } from './teachers.service';

@Module({
  imports: [PrismaModule],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
