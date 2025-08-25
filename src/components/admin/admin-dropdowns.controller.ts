import { Controller, Get, UseGuards, Query, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { GetCurrentUserId } from '../../common/decorators';
import { StrategyEnum } from '../auth/strategies';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards';
import { DropdownsService } from './dropdowns.service';
import { DropdownDataResult } from './results/dropdown-data.result';

@ApiTags('Dropdowns')
@Controller('dropdowns')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard)
export class DropdownsController {
  constructor(private readonly dropdownsService: DropdownsService) {}

  @Get('data')
  @ApiOperation({
    summary: 'Get dropdown data',
    description:
      'Fetch teachers, departments, sessions, levels, terms, and subjects for populating dropdowns',
  })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    type: Boolean,
    description: 'Include archived departments (default: false)',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive subjects (default: false)',
  })
  @ApiQuery({
    name: 'includeInactiveTeachers',
    required: false,
    type: Boolean,
    description: 'Include inactive teachers (default: false)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dropdown data retrieved successfully',
    type: DropdownDataResult,
  })
  async getDropdownData(
    @GetCurrentUserId() userId: string,
    @Query('includeArchived', new DefaultValuePipe(false)) includeArchived: boolean,
    @Query('includeInactive', new DefaultValuePipe(false)) includeInactive: boolean,
    @Query('includeInactiveTeachers', new DefaultValuePipe(false)) includeInactiveTeachers: boolean,
  ) {
    const data = await this.dropdownsService.getDropdownData(
      userId,
      includeArchived,
      includeInactive,
      includeInactiveTeachers,
    );
    return new DropdownDataResult(data);
  }
}
