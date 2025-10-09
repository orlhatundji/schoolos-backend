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
  HttpCode
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StudentPromotionsService } from './student-promotions.service';
import { CreatePromotionBatchDto } from './dto/create-promotion-batch.dto';
import { PromoteStudentDto } from './dto/promote-student.dto';
import { PromoteClassArmStudentsDto } from './dto/promote-classarm-students.dto';
import { CreateLevelProgressionDto, UpdateLevelProgressionDto } from './dto/level-progression.dto';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards/access-token.guard';
import { PoliciesGuard } from '../roles-manager/policies/policies.guard';
import { CheckPolicies } from '../roles-manager/policies/check-policies.decorator';
import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import { ManageStudentPolicyHandler } from '../students/policies/student-policy.handler';
import { StrategyEnum } from '../auth/strategies/strategy.enum';

@Controller('student-promotions')
@ApiTags('Student Promotions')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard, PoliciesGuard)
export class StudentPromotionsController {
  constructor(private readonly promotionsService: StudentPromotionsService) {}

  @Post('batches')
  @ApiOperation({ summary: 'Create a new promotion batch' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Promotion batch created successfully'
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async createPromotionBatch(
    @GetCurrentUserId() userId: string,
    @Body() dto: CreatePromotionBatchDto
  ) {
    return this.promotionsService.createPromotionBatch(userId, dto);
  }

  @Post('classarm-promote')
  @ApiOperation({ summary: 'Promote students from a specific class arm' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Students promoted successfully'
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async promoteClassArmStudents(
    @GetCurrentUserId() userId: string,
    @Body() dto: PromoteClassArmStudentsDto
  ) {
    return this.promotionsService.promoteClassArmStudents(userId, dto);
  }

  @Post('batches/:batchId/execute')
  @ApiOperation({ summary: 'Execute a promotion batch' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Promotion batch executed successfully'
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async executePromotionBatch(
    @GetCurrentUserId() userId: string,
    @Param('batchId') batchId: string
  ) {
    return this.promotionsService.executePromotionBatch(userId, batchId);
  }

  @Get('batches/:batchId')
  @ApiOperation({ summary: 'Get promotion batch details' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Promotion batch details retrieved successfully'
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getPromotionBatch(
    @GetCurrentUserId() userId: string,
    @Param('batchId') batchId: string
  ) {
    return this.promotionsService.getPromotionBatch(userId, batchId);
  }

  @Get('batches')
  @ApiOperation({ summary: 'Get all promotion batches for school' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Promotion batches retrieved successfully'
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getPromotionBatches(
    @GetCurrentUserId() userId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.promotionsService.getPromotionBatches(userId, {
      status,
      page: page || 1,
      limit: limit || 10
    });
  }

  @Post('promote')
  @ApiOperation({ summary: 'Promote individual student' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student promoted successfully'
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async promoteStudent(
    @GetCurrentUserId() userId: string,
    @Body() dto: PromoteStudentDto
  ) {
    return this.promotionsService.promoteStudent(userId, dto);
  }

  @Get('preview')
  @ApiOperation({ summary: 'Get promotion preview for students' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Promotion preview retrieved successfully'
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getPromotionPreview(
    @GetCurrentUserId() userId: string,
    @Query('fromSessionId') fromSessionId: string,
    @Query('toSessionId') toSessionId: string
  ) {
    return this.promotionsService.getPromotionPreview(
      userId,
      fromSessionId,
      toSessionId
    );
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get promotion statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Promotion statistics retrieved successfully'
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getPromotionStatistics(
    @GetCurrentUserId() userId: string,
    @Query('sessionId') sessionId: string
  ) {
    return this.promotionsService.getPromotionStatistics(userId, sessionId);
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
  @CheckPolicies(new ManageStudentPolicyHandler())
  async deleteLevelProgression(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string
  ) {
    return this.promotionsService.deleteLevelProgression(userId, id);
  }
}
