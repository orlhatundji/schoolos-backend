import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';
import { AuthModule } from '../auth/auth.module';
import { RolesManagerModule } from '../roles-manager/roles-manager.module';
import { AssessmentStructuresController } from './assessment-structures.controller';
import { AssessmentStructuresRepository } from './assessment-structures.repository';
import { AssessmentStructuresService } from './assessment-structures.service';

@Module({
  imports: [PrismaModule, AuthModule, RolesManagerModule],
  providers: [AssessmentStructuresService, AssessmentStructuresRepository, Encryptor],
  controllers: [AssessmentStructuresController],
  exports: [AssessmentStructuresService],
})
export class AssessmentStructuresModule {}
