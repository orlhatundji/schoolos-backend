import { Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../common/decorators';
import { PlatformAdminGuard } from '../../common/guards';
import { StrategyEnum } from '../auth/strategies';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards';
import {
  ListSeedsResult,
  RunSeedResult,
  SeedDescriptorResult,
} from './results/seed-runner.result';
import { SeedRunnerService } from './seed-runner.service';

@Controller('platform/seeds')
@ApiTags('Platform Seeds')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard, PlatformAdminGuard)
export class SeedRunnerController {
  constructor(private readonly service: SeedRunnerService) {}

  @Get()
  @ApiOperation({
    summary: 'List available platform seed scripts with metadata about their last run',
  })
  @ApiOkResponse({ type: ListSeedsResult })
  async list(): Promise<ListSeedsResult> {
    const seeds = (await this.service.list()) as SeedDescriptorResult[];
    return { seeds };
  }

  @Post(':slug/run')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'slug',
    description: 'Seed identifier (e.g. canonical-subjects, equation-library)',
  })
  @ApiOperation({
    summary:
      'Run a single platform seed script. Idempotent: each script upserts only and never deletes existing rows.',
  })
  @ApiOkResponse({ type: RunSeedResult })
  async run(
    @Param('slug') slug: string,
    @GetCurrentUserId() userId: string,
  ): Promise<RunSeedResult> {
    const audit = await this.service.run(slug, userId);
    return {
      id: audit.id,
      status: audit.status,
      upserted: audit.upserted,
      skipped: audit.skipped,
      durationMs: audit.durationMs,
      notes: audit.notes,
    };
  }
}
