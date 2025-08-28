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
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../../common/decorators';
import { StrategyEnum } from '../../auth/strategies';
import { AccessTokenGuard } from '../../auth/strategies/jwt/guards';
import { CheckPolicies, PoliciesGuard } from '../../roles-manager';
import { ManageStudentPolicyHandler } from '../../students/policies';
import { AcademicSessionsService } from './academic-sessions.service';
import { CreateAcademicSessionDto } from './dto/create-academic-session.dto';
import { UpdateAcademicSessionDto } from './dto/update-academic-session.dto';
import {
  AcademicSessionMessages,
  AcademicSessionResult,
  ManyAcademicSessionsResult,
} from './results';

@Controller('academic-sessions')
@ApiTags('Academic Sessions')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard, PoliciesGuard)
export class AcademicSessionsController {
  constructor(private readonly academicSessionsService: AcademicSessionsService) {}

  @Post()
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: AcademicSessionResult,
    description: AcademicSessionMessages.SUCCESS.SESSION_CREATED_SUCCESSFULLY,
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async create(
    @GetCurrentUserId() userId: string,
    @Body() data: CreateAcademicSessionDto,
  ): Promise<AcademicSessionResult> {
    const academicSession = await this.academicSessionsService.createAcademicSession(userId, data);

    return AcademicSessionResult.from(academicSession, {
      status: HttpStatus.CREATED,
      message: AcademicSessionMessages.SUCCESS.SESSION_CREATED_SUCCESSFULLY,
    });
  }

  @Get()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async findAll(@GetCurrentUserId() userId: string) {
    const academicSessions = await this.academicSessionsService.getAllAcademicSessions(userId);

    return ManyAcademicSessionsResult.from(academicSessions, {
      status: HttpStatus.OK,
      message: AcademicSessionMessages.SUCCESS.SESSION_FETCHED_SUCCESSFULLY,
    });
  }

  @Get(':id')
  @CheckPolicies(new ManageStudentPolicyHandler())
  async findOne(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    const academicSession = await this.academicSessionsService.getAcademicSessionById(userId, id);

    return AcademicSessionResult.from(academicSession, {
      status: HttpStatus.OK,
      message: AcademicSessionMessages.SUCCESS.SESSION_FETCHED_SUCCESSFULLY,
    });
  }

  @Patch(':id')
  @CheckPolicies(new ManageStudentPolicyHandler())
  async update(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() data: UpdateAcademicSessionDto,
  ): Promise<AcademicSessionResult> {
    const academicSession = await this.academicSessionsService.updateAcademicSession(
      userId,
      id,
      data,
    );
    return AcademicSessionResult.from(academicSession, {
      status: HttpStatus.OK,
      message: AcademicSessionMessages.SUCCESS.SESSION_UPDATED_SUCCESSFULLY,
    });
  }

  @Delete(':id')
  @CheckPolicies(new ManageStudentPolicyHandler())
  async remove(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<AcademicSessionResult> {
    const academicSession = await this.academicSessionsService.deleteAcademicSession(userId, id);
    return AcademicSessionResult.from(academicSession, {
      status: HttpStatus.OK,
      message: AcademicSessionMessages.SUCCESS.SESSION_DELETED_SUCCESSFULLY,
    });
  }
}
