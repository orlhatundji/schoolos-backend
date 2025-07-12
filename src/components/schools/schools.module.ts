import { Module } from '@nestjs/common';
import { SchoolsRepository } from './schools.repository';
import { SchoolsService } from './schools.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SchoolsRepository, SchoolsService],
  exports: [SchoolsService],
})
export class SchoolsModule {}
