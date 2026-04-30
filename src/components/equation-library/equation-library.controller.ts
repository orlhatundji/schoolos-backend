import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { StrategyEnum } from '../auth/strategies';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards';
import { ListEquationsDto } from './dto/list-equations.dto';
import { EquationLibraryService } from './equation-library.service';
import { EquationLibraryListResult } from './results/equation-library-list.result';

@Controller('equation-library')
@ApiTags('Equation Library')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard)
export class EquationLibraryController {
  constructor(private readonly service: EquationLibraryService) {}

  @Get()
  @ApiOperation({
    summary: 'List curated equations, optionally filtered by canonical subject and/or search term',
  })
  @ApiOkResponse({ type: EquationLibraryListResult })
  async list(@Query() query: ListEquationsDto): Promise<EquationLibraryListResult> {
    return this.service.list({ subjectSlug: query.subjectSlug, q: query.q });
  }
}
