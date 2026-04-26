import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { StrategyEnum } from '../auth/strategies';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards';
import { CanonicalReferencesService } from './canonical-references.service';
import {
  CanonicalLevelResult,
  CanonicalLevelsListResult,
  CanonicalSubjectResult,
  CanonicalSubjectsListResult,
  CanonicalTermResult,
  CanonicalTermsListResult,
} from './results/canonical.result';

@Controller('canonical-references')
@ApiTags('Canonical References')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard)
export class CanonicalReferencesController {
  constructor(private readonly service: CanonicalReferencesService) {}

  @Get('subjects')
  @ApiOperation({
    summary:
      'List schos-managed canonical subjects. Used to populate dropdowns when curating SCHOS_CURATED content.',
  })
  @ApiResponse({ status: 200, type: CanonicalSubjectsListResult })
  async listSubjects() {
    const subjects = await this.service.listSubjects(true);
    return new CanonicalSubjectsListResult(subjects.map((s) => new CanonicalSubjectResult(s)));
  }

  @Get('levels')
  @ApiOperation({
    summary:
      'List schos-managed canonical levels (PRY1-SSS3, GRADE_1-12, A_LEVEL, etc). Optional ?group= filter.',
  })
  @ApiResponse({ status: 200, type: CanonicalLevelsListResult })
  async listLevels(@Query('group') group?: string) {
    const levels = await this.service.listLevels(true, group);
    return new CanonicalLevelsListResult(levels.map((l) => new CanonicalLevelResult(l)));
  }

  @Get('terms')
  @ApiOperation({ summary: 'List schos-managed canonical terms (First, Second, Third).' })
  @ApiResponse({ status: 200, type: CanonicalTermsListResult })
  async listTerms() {
    const terms = await this.service.listTerms(true);
    return new CanonicalTermsListResult(terms.map((t) => new CanonicalTermResult(t)));
  }
}
