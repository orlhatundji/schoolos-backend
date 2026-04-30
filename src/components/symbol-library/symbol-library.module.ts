import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';
import { AuthModule } from '../auth/auth.module';
import { SymbolLibraryController } from './symbol-library.controller';
import { SymbolLibraryService } from './symbol-library.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SymbolLibraryController],
  providers: [SymbolLibraryService, Encryptor],
  exports: [SymbolLibraryService],
})
export class SymbolLibraryModule {}
