import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards';
import { AcademicSettingsService } from './academic-settings.service';
import { AcademicSettingsDto } from './dto/academic-settings.dto';

@ApiTags('Academic Settings')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('settings/academic-promotion')
export class AcademicSettingsController {
  constructor(private readonly academicSettingsService: AcademicSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get academic promotion settings for the school' })
  @ApiResponse({
    status: 200,
    description: 'Academic promotion settings retrieved successfully',
  })
  async getAcademicSettings(@GetCurrentUserId() userId: string) {
    return this.academicSettingsService.getAcademicSettings(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Save academic promotion settings for the school' })
  @ApiResponse({
    status: 200,
    description: 'Academic promotion settings saved successfully',
  })
  async saveAcademicSettings(@GetCurrentUserId() userId: string, @Body() dto: AcademicSettingsDto) {
    return this.academicSettingsService.saveAcademicSettings(userId, dto);
  }
}
