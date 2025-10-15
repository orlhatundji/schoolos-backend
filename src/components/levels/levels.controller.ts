import { Body, Controller, Delete, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../common/decorators';
import { StrategyEnum } from '../auth/strategies';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards';
import { CheckPolicies, PoliciesGuard } from '../roles-manager';
import { ManageStudentPolicyHandler } from '../students/policies';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { ReorderLevelDto } from './dto/reorder-level.dto';
import { LevelsService } from './levels.service';
import {
  ArchiveLevelSwagger,
  CreateLevelSwagger,
  DeleteLevelSwagger,
  ReorderLevelSwagger,
  UnarchiveLevelSwagger,
  UpdateLevelSwagger,
} from './levels.swagger';
import { ArchiveLevelResult } from './results/archive-level.result';
import { CreateLevelResult } from './results/create-level.result';
import { DeleteLevelResult } from './results/delete-level.result';
import { ReorderLevelResult } from './results/reorder-level.result';
import { UnarchiveLevelResult } from './results/unarchive-level.result';
import { UpdateLevelResult } from './results/update-level.result';

@Controller('levels')
@ApiTags('Levels')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard, PoliciesGuard)
export class LevelsController {
  constructor(private readonly levelsService: LevelsService) {}

  @Post()
  @CreateLevelSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async createLevel(@GetCurrentUserId() userId: string, @Body() createLevelDto: CreateLevelDto) {
    const data = await this.levelsService.createLevel(userId, createLevelDto);
    return new CreateLevelResult(data);
  }

  @Put(':levelId')
  @UpdateLevelSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async updateLevel(
    @GetCurrentUserId() userId: string,
    @Param('levelId') levelId: string,
    @Body() updateLevelDto: UpdateLevelDto,
  ) {
    const data = await this.levelsService.updateLevel(userId, levelId, updateLevelDto);
    return new UpdateLevelResult(data);
  }

  @Post(':levelId/archive')
  @ArchiveLevelSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async archiveLevel(@GetCurrentUserId() userId: string, @Param('levelId') levelId: string) {
    const data = await this.levelsService.archiveLevel(userId, levelId);
    return new ArchiveLevelResult(data);
  }

  @Post(':levelId/unarchive')
  @UnarchiveLevelSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async unarchiveLevel(@GetCurrentUserId() userId: string, @Param('levelId') levelId: string) {
    const data = await this.levelsService.unarchiveLevel(userId, levelId);
    return new UnarchiveLevelResult(data);
  }

  @Put(':levelId/reorder')
  @ReorderLevelSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async reorderLevel(
    @GetCurrentUserId() userId: string,
    @Param('levelId') levelId: string,
    @Body() reorderLevelDto: ReorderLevelDto,
  ) {
    const data = await this.levelsService.reorderLevel(userId, levelId, reorderLevelDto);
    return new ReorderLevelResult(data);
  }

  @Post('fix-duplicate-orders')
  @CheckPolicies(new ManageStudentPolicyHandler())
  async fixDuplicateOrders(@GetCurrentUserId() userId: string) {
    const data = await this.levelsService.fixDuplicateOrders(userId);
    return { success: true, message: data.message };
  }

  @Delete(':levelId')
  @DeleteLevelSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async deleteLevel(@GetCurrentUserId() userId: string, @Param('levelId') levelId: string) {
    const data = await this.levelsService.deleteLevel(userId, levelId);
    return new DeleteLevelResult(data);
  }
}
