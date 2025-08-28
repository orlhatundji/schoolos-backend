import { Module } from '@nestjs/common';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RolesManagerModule } from '../roles-manager/roles-manager.module';
import { Encryptor } from '../../utils/encryptor';

@Module({
  imports: [PrismaModule, AuthModule, RolesManagerModule],
  controllers: [SubjectsController],
  providers: [SubjectsService, Encryptor],
  exports: [SubjectsService],
})
export class SubjectsModule {}
