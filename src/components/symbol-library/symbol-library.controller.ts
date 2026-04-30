import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { StrategyEnum } from '../auth/strategies';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards';
import { ListSymbolsDto } from './dto/list-symbols.dto';
import { SymbolLibraryListResult } from './results/symbol-library-list.result';
import { SymbolLibraryService } from './symbol-library.service';

@Controller('symbol-library')
@ApiTags('Symbol Library')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard)
export class SymbolLibraryController {
  constructor(private readonly service: SymbolLibraryService) {}

  @Get()
  @ApiOperation({
    summary: 'List curated math symbols, optionally filtered by category and/or search term',
  })
  @ApiOkResponse({ type: SymbolLibraryListResult })
  async list(@Query() query: ListSymbolsDto): Promise<SymbolLibraryListResult> {
    return this.service.list({ category: query.category, q: query.q });
  }
}
