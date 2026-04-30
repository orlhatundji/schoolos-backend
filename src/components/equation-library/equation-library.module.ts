import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';
import { AuthModule } from '../auth/auth.module';
import { EquationLibraryController } from './equation-library.controller';
import { EquationLibraryService } from './equation-library.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EquationLibraryController],
  providers: [EquationLibraryService, Encryptor],
  exports: [EquationLibraryService],
})
export class EquationLibraryModule {}
