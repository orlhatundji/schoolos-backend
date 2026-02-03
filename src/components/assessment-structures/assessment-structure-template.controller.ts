import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from '../../components/auth/strategies/jwt/guards/access-token.guard';
import { PoliciesGuard } from '../../components/roles-manager/policies/policies.guard';
import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import { CheckPolicies } from '../../components/roles-manager/policies/check-policies.decorator';
import { AssessmentStructureTemplateService } from './assessment-structure-template.service';
import {
  CreateAssessmentStructureTemplateDto,
  UpdateAssessmentStructureTemplateDto,
  AssessmentStructureTemplateResponseDto,
} from './dto/assessment-structure-template.dto';

@ApiTags('Assessment Structure Templates')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, PoliciesGuard)
@Controller('assessment-structure-templates')
export class AssessmentStructureTemplateController {
  constructor(
    private readonly assessmentStructureTemplateService: AssessmentStructureTemplateService,
  ) {}

  @Post()
  @CheckPolicies()
  @ApiOperation({ summary: 'Create a new assessment structure template' })
  @ApiResponse({ status: 201, description: 'Assessment structure template created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Conflict - template already exists for this session' })
  async create(
    @GetCurrentUserId() userId: string,
    @Body() createDto: CreateAssessmentStructureTemplateDto,
  ) {
    const template = await this.assessmentStructureTemplateService.create(userId, createDto);
    return {
      status: 201,
      message: 'Assessment structure template created successfully',
      data: template,
    };
  }

  @Get('active')
  @CheckPolicies()
  @ApiOperation({ summary: 'Get active assessment structure template for a session' })
  @ApiResponse({ status: 200, description: 'Assessment structure template retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 200, description: 'Template will be created automatically if missing' })
  async getActive(
    @GetCurrentUserId() userId: string,
    @Query('academicSessionId') academicSessionId: string,
  ) {
    // Service will automatically create template if it doesn't exist
    const template = await this.assessmentStructureTemplateService.findActiveForSession(
      userId,
      academicSessionId,
    );

    const hasRecordedScores = await this.assessmentStructureTemplateService.hasRecordedScores(template);

    return {
      status: 200,
      message: 'Assessment structure template retrieved successfully',
      data: { ...template, hasRecordedScores },
    };
  }

  @Put(':id')
  @CheckPolicies()
  @ApiOperation({ summary: 'Update an assessment structure template' })
  @ApiResponse({ status: 200, description: 'Assessment structure template updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found - template does not exist' })
  async update(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateAssessmentStructureTemplateDto,
  ) {
    const template = await this.assessmentStructureTemplateService.update(userId, id, updateDto);
    return {
      status: 200,
      message: 'Assessment structure template updated successfully',
      data: template,
    };
  }

  @Delete(':id')
  @CheckPolicies()
  @ApiOperation({ summary: 'Delete an assessment structure template' })
  @ApiResponse({ status: 200, description: 'Assessment structure template deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found - template does not exist' })
  @ApiResponse({ status: 409, description: 'Conflict - template is in use and cannot be deleted' })
  async delete(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    const result = await this.assessmentStructureTemplateService.delete(userId, id);
    return {
      status: 200,
      message: result.message,
    };
  }

  @Post('global-default')
  @CheckPolicies()
  @ApiOperation({ summary: 'Create global default assessment structure template' })
  @ApiResponse({ status: 201, description: 'Global default template created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Conflict - global default already exists' })
  async createGlobalDefault() {
    const template = await this.assessmentStructureTemplateService.createGlobalDefault();
    return {
      status: 201,
      message: 'Global default assessment structure template created successfully',
      data: template,
    };
  }
}
