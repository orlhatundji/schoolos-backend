import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards/access-token.guard';
import { CheckPolicies } from '../roles-manager/policies/check-policies.decorator';
import { PoliciesGuard } from '../roles-manager/policies/policies.guard';
import { AssessmentStructuresService } from './assessment-structures.service';
import { CreateAssessmentStructureDto, UpdateAssessmentStructureDto } from './dto';
import {
  AssessmentStructureMessages,
  AssessmentStructureResult,
  ManyAssessmentStructuresResult,
} from './results';

@ApiTags('Assessment Structures')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, PoliciesGuard)
@Controller('assessment-structures')
export class AssessmentStructuresController {
  constructor(private readonly assessmentStructuresService: AssessmentStructuresService) {}

  @Post()
  @CheckPolicies()
  @ApiOperation({ summary: 'Create a new assessment structure' })
  @ApiResponse({ status: 201, description: 'Assessment structure created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - assessment structure with this name already exists',
  })
  async create(
    @GetCurrentUserId() userId: string,
    @Body() createAssessmentStructureDto: CreateAssessmentStructureDto,
  ) {
    const assessmentStructure = await this.assessmentStructuresService.create(
      userId,
      createAssessmentStructureDto,
    );
    return AssessmentStructureResult.from(assessmentStructure, {
      status: HttpStatus.CREATED,
      message: AssessmentStructureMessages.SUCCESS.CREATED,
    });
  }

  @Get()
  @CheckPolicies()
  @ApiOperation({ summary: 'Get all assessment structures for the school' })
  @ApiResponse({ status: 200, description: 'Assessment structures retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(@GetCurrentUserId() userId: string) {
    const assessmentStructures = await this.assessmentStructuresService.findAll(userId);
    return ManyAssessmentStructuresResult.from(assessmentStructures, {
      status: HttpStatus.OK,
      message: AssessmentStructureMessages.SUCCESS.FOUND,
    });
  }

  @Get(':id')
  @CheckPolicies()
  @ApiOperation({ summary: 'Get a specific assessment structure by ID' })
  @ApiResponse({ status: 200, description: 'Assessment structure retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Assessment structure not found' })
  async findOne(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    const assessmentStructure = await this.assessmentStructuresService.findOne(userId, id);
    return AssessmentStructureResult.from(assessmentStructure, {
      status: HttpStatus.OK,
      message: AssessmentStructureMessages.SUCCESS.FOUND,
    });
  }

  @Patch(':id')
  @CheckPolicies()
  @ApiOperation({ summary: 'Update an existing assessment structure' })
  @ApiResponse({ status: 200, description: 'Assessment structure updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Assessment structure not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - assessment structure with this name already exists',
  })
  async update(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() updateAssessmentStructureDto: UpdateAssessmentStructureDto,
  ) {
    const assessmentStructure = await this.assessmentStructuresService.update(
      userId,
      id,
      updateAssessmentStructureDto,
    );
    return AssessmentStructureResult.from(assessmentStructure, {
      status: HttpStatus.OK,
      message: AssessmentStructureMessages.SUCCESS.UPDATED,
    });
  }

  @Delete(':id')
  @CheckPolicies()
  @ApiOperation({ summary: 'Delete an assessment structure (soft delete)' })
  @ApiResponse({ status: 200, description: 'Assessment structure deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Assessment structure not found' })
  async remove(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    const result = await this.assessmentStructuresService.remove(userId, id);
    return {
      status: HttpStatus.OK,
      message: result.message,
    };
  }
}
