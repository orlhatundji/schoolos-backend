import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';
import { RolesManagerModule } from '../roles-manager/roles-manager.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [PrismaModule, RolesManagerModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, Encryptor],
  exports: [CategoriesService],
})
export class CategoriesModule {}
