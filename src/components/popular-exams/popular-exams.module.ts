import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';
import { AuthModule } from '../auth/auth.module';
import { PopularExamsController } from './popular-exams.controller';
import { PopularExamsService } from './popular-exams.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PopularExamsController],
  providers: [PopularExamsService, Encryptor],
  exports: [PopularExamsService],
})
export class PopularExamsModule {}
