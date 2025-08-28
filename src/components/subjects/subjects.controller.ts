import { Body, Controller, Delete, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../common/decorators';
import { StrategyEnum } from '../auth/strategies';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards';
import { CheckPolicies, PoliciesGuard } from '../roles-manager';
import { ManageStudentPolicyHandler } from '../students/policies';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { CreateSubjectResult } from './results/create-subject.result';
import { DeleteSubjectResult } from './results/delete-subject.result';
import { UpdateSubjectResult } from './results/update-subject.result';
import { SubjectsService } from './subjects.service';
import {
  CreateSubjectSwagger,
  DeleteSubjectSwagger,
  UpdateSubjectSwagger,
} from './subjects.swagger';

@Controller('subjects')
@ApiTags('Subjects')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard, PoliciesGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @CreateSubjectSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async createSubject(
    @GetCurrentUserId() userId: string,
    @Body() createSubjectDto: CreateSubjectDto,
  ) {
    const data = await this.subjectsService.createSubject(userId, createSubjectDto);
    return new CreateSubjectResult(data);
  }

  @Put(':subjectId')
  @UpdateSubjectSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async updateSubject(
    @GetCurrentUserId() userId: string,
    @Param('subjectId') subjectId: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ) {
    const data = await this.subjectsService.updateSubject(userId, subjectId, updateSubjectDto);
    return new UpdateSubjectResult(data);
  }

  @Delete(':subjectId')
  @DeleteSubjectSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async deleteSubject(@GetCurrentUserId() userId: string, @Param('subjectId') subjectId: string) {
    const data = await this.subjectsService.deleteSubject(userId, subjectId);
    return new DeleteSubjectResult(data);
  }
}
