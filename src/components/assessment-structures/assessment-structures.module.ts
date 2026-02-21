import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';
import { AuthModule } from '../auth/auth.module';
import { RolesManagerModule } from '../roles-manager/roles-manager.module';
import { AssessmentStructureTemplateController } from './assessment-structure-template.controller';
import { AssessmentStructureTemplateService } from './assessment-structure-template.service';

@Module({
  imports: [PrismaModule, AuthModule, RolesManagerModule],
  providers: [
    AssessmentStructureTemplateService,
    Encryptor,
  ],
  controllers: [
    AssessmentStructureTemplateController,
  ],
  exports: [
    AssessmentStructureTemplateService,
  ],
})
export class AssessmentStructuresModule {}
