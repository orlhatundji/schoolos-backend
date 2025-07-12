import { Module } from '@nestjs/common';
import { CounterService } from './counter.service';
import { PrismaModule } from '../../prisma';

@Module({
  imports: [PrismaModule],
  providers: [CounterService],
  exports: [CounterService],
})
export class CounterModule {}
