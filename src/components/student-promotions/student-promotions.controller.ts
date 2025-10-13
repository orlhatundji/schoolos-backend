import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  UseInterceptors
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StudentPromotionsService } from './student-promotions.service';
import { PromoteStudentDto } from './dto/promote-student.dto';
import { PromoteClassArmStudentsDto } from './dto/promote-classarm-students.dto';
import { CreateLevelProgressionDto, UpdateLevelProgressionDto } from './dto/level-progression.dto';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards/access-token.guard';
import { PoliciesGuard } from '../roles-manager/policies/policies.guard';
import { CheckPolicies } from '../roles-manager/policies/check-policies.decorator';
import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import { ManageStudentPolicyHandler } from '../students/policies/student-policy.handler';
import { StrategyEnum } from '../auth/strategies/strategy.enum';
import { ActivityLogInterceptor } from '../../common/interceptors/activity-log.interceptor';
import { LogActivity } from '../../common/decorators/log-activity.decorator';

@Controller('student-promotions')
@ApiTags('Student Promotions')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard, PoliciesGuard)
export class StudentPromotionsController {
  constructor(private readonly promotionsService: StudentPromotionsService) {}


  @Post('classarm-promote')
  @ApiOperation({ summary: 'Promote students from a specific class arm' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Students promoted successfully'
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'PROMOTE_CLASSARM_STUDENTS',
    entityType: 'STUDENT_PROMOTION',
    entityId: (args) => args[1]?.fromClassArmId,
    description: (args) => `Promoted students from class arm to ${args[1]?.toLevelId ? 'next level' : 'new class arm'}`,
    category: 'STUDENT_PROMOTION',
    details: (args, result) => ({
      fromClassArmId: args[1]?.fromClassArmId,
      toLevelId: args[1]?.toLevelId,
      toAcademicSessionId: args[1]?.toAcademicSessionId,
      promotionType: args[1]?.promotionType,
      totalStudents: result?.totalStudents,
      successfulPromotions: result?.successfulPromotions,
      failedPromotions: result?.failedPromotions
    })
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async promoteClassArmStudents(
    @GetCurrentUserId() userId: string,
    @Body() dto: PromoteClassArmStudentsDto
  ) {
    return this.promotionsService.promoteClassArmStudents(userId, dto);
  }


  @Post('promote')
  @ApiOperation({ summary: 'Promote individual student' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student promoted successfully'
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'PROMOTE_STUDENT',
    entityType: 'STUDENT_PROMOTION',
    entityId: (args) => args[1]?.studentId,
    description: (args) => `Promoted student to new class arm`,
    category: 'STUDENT_PROMOTION',
    details: (args, result) => ({
      studentId: args[1]?.studentId,
      toClassArmId: args[1]?.toClassArmId,
      promotionType: args[1]?.promotionType,
      notes: args[1]?.notes,
      fromLevel: result?.fromLevel,
      toLevel: result?.toLevel,
      fromClassArm: result?.fromClassArm,
      toClassArm: result?.toClassArm
    })
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async promoteStudent(
    @GetCurrentUserId() userId: string,
    @Body() dto: PromoteStudentDto
  ) {
    return this.promotionsService.promoteStudent(userId, dto);
  }


  @Get('history/:studentId')
  @ApiOperation({ summary: 'Get student promotion history' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student promotion history retrieved successfully'
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getStudentPromotionHistory(
    @Param('studentId') studentId: string
  ) {
    return this.promotionsService.getStudentPromotionHistory(studentId);
  }

  // Level Progression Management

  @Post('level-progressions')
  @ApiOperation({ summary: 'Create level progression rule' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Level progression rule created successfully'
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'CREATE_LEVEL_PROGRESSION',
    entityType: 'LEVEL_PROGRESSION',
    entityId: (args) => args[1]?.fromLevelId,
    description: 'Created level progression rule',
    category: 'STUDENT_PROMOTION',
    details: (args, result) => ({
      fromLevelId: args[1]?.fromLevelId,
      toLevelId: args[1]?.toLevelId,
      isAutomatic: args[1]?.isAutomatic,
      requiresApproval: args[1]?.requiresApproval,
      order: args[1]?.order
    })
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async createLevelProgression(
    @GetCurrentUserId() userId: string,
    @Body() dto: CreateLevelProgressionDto
  ) {
    return this.promotionsService.createLevelProgression(userId, dto);
  }

  @Get('level-progressions')
  @ApiOperation({ summary: 'Get all level progression rules for school' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Level progression rules retrieved successfully'
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getLevelProgressions(
    @GetCurrentUserId() userId: string
  ) {
    return this.promotionsService.getLevelProgressions(userId);
  }

  @Put('level-progressions/:id')
  @ApiOperation({ summary: 'Update level progression rule' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Level progression rule updated successfully'
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'UPDATE_LEVEL_PROGRESSION',
    entityType: 'LEVEL_PROGRESSION',
    entityId: (args) => args[2],
    description: 'Updated level progression rule',
    category: 'STUDENT_PROMOTION',
    details: (args, result) => ({
      levelProgressionId: args[2],
      fromLevelId: args[3]?.fromLevelId,
      toLevelId: args[3]?.toLevelId,
      isAutomatic: args[3]?.isAutomatic,
      requiresApproval: args[3]?.requiresApproval,
      order: args[3]?.order
    })
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async updateLevelProgression(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLevelProgressionDto
  ) {
    return this.promotionsService.updateLevelProgression(userId, id, dto);
  }

  @Delete('level-progressions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete level progression rule' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Level progression rule deleted successfully'
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'DELETE_LEVEL_PROGRESSION',
    entityType: 'LEVEL_PROGRESSION',
    entityId: (args) => args[2],
    description: 'Deleted level progression rule',
    category: 'STUDENT_PROMOTION',
    details: (args, result) => ({
      levelProgressionId: args[2]
    })
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async deleteLevelProgression(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string
  ) {
    return this.promotionsService.deleteLevelProgression(userId, id);
  }
}
