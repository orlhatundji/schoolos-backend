import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';
import { AuthModule } from '../auth/auth.module';
import { CanonicalReferencesController } from './canonical-references.controller';
import { CanonicalReferencesService } from './canonical-references.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CanonicalReferencesController],
  providers: [CanonicalReferencesService, Encryptor],
  exports: [CanonicalReferencesService],
})
export class CanonicalReferencesModule {}
