import { Module } from '@nestjs/common';
import { StudentPromotionsController } from './student-promotions.controller';
import { StudentPromotionsService } from './student-promotions.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { Encryptor } from '../../utils/encryptor';
import { RolesManagerModule } from '../roles-manager/roles-manager.module';
import { StudentsModule } from '../students/students.module';
import { ActivityLogModule } from '../../common/modules/activity-log.module';

@Module({
  imports: [PrismaModule, RolesManagerModule, StudentsModule, ActivityLogModule],
  controllers: [StudentPromotionsController],
  providers: [StudentPromotionsService, Encryptor],
  exports: [StudentPromotionsService]
})
export class StudentPromotionsModule {}
