import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { SystemAdminGuard } from '../../common/guards';
import { StrategyEnum } from '../auth/strategies';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards';
import { CanonicalReferencesService } from './canonical-references.service';
import {
  CreateCanonicalLevelDto,
  CreateCanonicalSubjectDto,
  CreateCanonicalTermDto,
  UpdateCanonicalLevelDto,
  UpdateCanonicalSubjectDto,
  UpdateCanonicalTermDto,
} from './dto/canonical.dto';
import {
  CanonicalLevelResult,
  CanonicalLevelsListResult,
  CanonicalSubjectResult,
  CanonicalSubjectsListResult,
  CanonicalTermResult,
  CanonicalTermsListResult,
} from './results/canonical.result';

@Controller('canonical-references')
@ApiTags('Canonical References')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard)
export class CanonicalReferencesController {
  constructor(private readonly service: CanonicalReferencesService) {}

  // ---------- Subjects ----------

  @Get('subjects')
  @ApiOperation({
    summary:
      'List schos-managed canonical subjects. Used to populate dropdowns when curating SCHOS_CURATED content. By default returns active only — pass ?includeInactive=true to see all.',
  })
  @ApiResponse({ status: 200, type: CanonicalSubjectsListResult })
  async listSubjects(@Query('includeInactive') includeInactive?: string) {
    const subjects = await this.service.listSubjects(includeInactive !== 'true');
    return new CanonicalSubjectsListResult(subjects.map((s) => new CanonicalSubjectResult(s)));
  }

  @Post('subjects')
  @UseGuards(SystemAdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a canonical subject (platform admin only).' })
  @ApiResponse({ status: 201, type: CanonicalSubjectResult })
  async createSubject(@Body() dto: CreateCanonicalSubjectDto) {
    const s = await this.service.createSubject(dto);
    return new CanonicalSubjectResult(s);
  }

  @Patch('subjects/:id')
  @UseGuards(SystemAdminGuard)
  @ApiOperation({ summary: 'Update a canonical subject (platform admin only).' })
  @ApiResponse({ status: 200, type: CanonicalSubjectResult })
  async updateSubject(@Param('id') id: string, @Body() dto: UpdateCanonicalSubjectDto) {
    const s = await this.service.updateSubject(id, dto);
    return new CanonicalSubjectResult(s);
  }

  @Delete('subjects/:id')
  @UseGuards(SystemAdminGuard)
  @ApiOperation({ summary: 'Soft-delete a canonical subject (platform admin only).' })
  async deleteSubject(@Param('id') id: string) {
    await this.service.deleteSubject(id);
    return { success: true, message: 'Canonical subject deleted' };
  }

  // ---------- Levels ----------

  @Get('levels')
  @ApiOperation({
    summary:
      'List schos-managed canonical levels (PRY1-SSS3, GRADE_1-12, A_LEVEL, etc). Optional ?group= filter, ?includeInactive=true.',
  })
  @ApiResponse({ status: 200, type: CanonicalLevelsListResult })
  async listLevels(
    @Query('group') group?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const levels = await this.service.listLevels(includeInactive !== 'true', group);
    return new CanonicalLevelsListResult(levels.map((l) => new CanonicalLevelResult(l)));
  }

  @Post('levels')
  @UseGuards(SystemAdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a canonical level (platform admin only).' })
  @ApiResponse({ status: 201, type: CanonicalLevelResult })
  async createLevel(@Body() dto: CreateCanonicalLevelDto) {
    const l = await this.service.createLevel(dto);
    return new CanonicalLevelResult(l);
  }

  @Patch('levels/:id')
  @UseGuards(SystemAdminGuard)
  @ApiOperation({ summary: 'Update a canonical level (platform admin only).' })
  @ApiResponse({ status: 200, type: CanonicalLevelResult })
  async updateLevel(@Param('id') id: string, @Body() dto: UpdateCanonicalLevelDto) {
    const l = await this.service.updateLevel(id, dto);
    return new CanonicalLevelResult(l);
  }

  @Delete('levels/:id')
  @UseGuards(SystemAdminGuard)
  @ApiOperation({ summary: 'Soft-delete a canonical level (platform admin only).' })
  async deleteLevel(@Param('id') id: string) {
    await this.service.deleteLevel(id);
    return { success: true, message: 'Canonical level deleted' };
  }

  // ---------- Terms ----------

  @Get('terms')
  @ApiOperation({ summary: 'List schos-managed canonical terms. ?includeInactive=true for all.' })
  @ApiResponse({ status: 200, type: CanonicalTermsListResult })
  async listTerms(@Query('includeInactive') includeInactive?: string) {
    const terms = await this.service.listTerms(includeInactive !== 'true');
    return new CanonicalTermsListResult(terms.map((t) => new CanonicalTermResult(t)));
  }

  @Post('terms')
  @UseGuards(SystemAdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a canonical term (platform admin only).' })
  @ApiResponse({ status: 201, type: CanonicalTermResult })
  async createTerm(@Body() dto: CreateCanonicalTermDto) {
    const t = await this.service.createTerm(dto);
    return new CanonicalTermResult(t);
  }

  @Patch('terms/:id')
  @UseGuards(SystemAdminGuard)
  @ApiOperation({ summary: 'Update a canonical term (platform admin only).' })
  @ApiResponse({ status: 200, type: CanonicalTermResult })
  async updateTerm(@Param('id') id: string, @Body() dto: UpdateCanonicalTermDto) {
    const t = await this.service.updateTerm(id, dto);
    return new CanonicalTermResult(t);
  }

  @Delete('terms/:id')
  @UseGuards(SystemAdminGuard)
  @ApiOperation({ summary: 'Soft-delete a canonical term (platform admin only).' })
  async deleteTerm(@Param('id') id: string) {
    await this.service.deleteTerm(id);
    return { success: true, message: 'Canonical term deleted' };
  }
}
