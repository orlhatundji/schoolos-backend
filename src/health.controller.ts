import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from './prisma';
import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators';

@Controller('health')
export class HealthController {
  constructor(
    private healthCheckService: HealthCheckService,
    private prisma: PrismaService,
    private prismaHealthIndicator: PrismaHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  check() {
    return this.healthCheckService.check([
      async () => this.prismaHealthIndicator.pingCheck('database', this.prisma),
    ]);
  }
}
