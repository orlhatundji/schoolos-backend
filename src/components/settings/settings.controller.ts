import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { SchoolConfigDto, UpdateSchoolConfigDto } from './dto';
import { GetCurrentUserId } from '../../common/decorators';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards';
import { StrategyEnum } from '../auth/strategies';

@Controller('settings')
@ApiTags('Settings')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('school-config')
  @ApiOperation({ summary: 'Get school configuration' })
  @ApiResponse({
    status: 200,
    description: 'School configuration retrieved successfully',
    type: SchoolConfigDto,
  })
  async getSchoolConfig(@GetCurrentUserId() userId: string): Promise<SchoolConfigDto> {
    return this.settingsService.getSchoolConfig(userId);
  }

  @Put('school-config')
  @ApiOperation({ summary: 'Update school configuration' })
  @ApiResponse({
    status: 200,
    description: 'School configuration updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            updatedFields: { type: 'array', items: { type: 'string' } },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  async updateSchoolConfig(
    @GetCurrentUserId() userId: string,
    @Body() updateData: UpdateSchoolConfigDto,
  ) {
    const result = await this.settingsService.updateSchoolConfig(userId, updateData);
    return {
      success: true,
      message: 'School configuration updated successfully',
      data: result,
    };
  }

  @Get('grading-model')
  @ApiOperation({ summary: 'Get school grading model' })
  @ApiResponse({
    status: 200,
    description: 'Grading model retrieved successfully',
  })
  async getGradingModel(@GetCurrentUserId() userId: string) {
    return this.settingsService.getGradingModel(userId);
  }

  @Put('grading-model')
  @ApiOperation({ summary: 'Create or update school grading model' })
  @ApiResponse({
    status: 200,
    description: 'Grading model updated successfully',
  })
  async upsertGradingModel(
    @GetCurrentUserId() userId: string,
    @Body() body: { model: Record<string, [number, number]> },
  ) {
    return this.settingsService.upsertGradingModel(userId, body.model);
  }
}
