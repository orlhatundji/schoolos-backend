import { Controller, Get, Param, Post, Body, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../../common/decorators';
import { StrategyEnum } from '../../auth/strategies';
import { AccessTokenGuard } from '../../auth/strategies/jwt/guards';
import { CheckPolicies, PoliciesGuard } from '../../roles-manager';
import { ManageStudentPolicyHandler } from '../../students/policies';
import { BffAdminService } from './bff-admin.service';
import {
  ClassroomDetailsLimitQuery,
  ClassroomDetailsPageQuery,
  ClassroomDetailsParam,
  ClassroomDetailsResponse,
  ClassroomsViewSwagger,
  CreateSubjectSwagger,
  DeleteSubjectSwagger,
  SingleStudentDetailsParam,
  SingleStudentDetailsResponse,
  SingleTeacherDetailsParam,
  SingleTeacherDetailsResponse,
  StudentDetailsClassroomQuery,
  StudentDetailsLimitQuery,
  StudentDetailsPageQuery,
  StudentDetailsResponse,
  StudentDetailsSearchQuery,
  StudentsViewSwagger,
  SubjectsViewSwagger,
  TeachersViewSwagger,
  UpdateSubjectSwagger,
} from './bff-admin.swagger';
import { AdminClassroomDetailsResult } from './results/admin-classroom-details.result';
import { AdminClassroomsViewResult } from './results/admin-classrooms-view.result';
import { AdminStudentsViewResult } from './results/admin-students-view.result';
import { AdminSubjectsViewResult } from './results/admin-subjects-view.result';
import { AdminTeachersViewResult } from './results/admin-teachers-view.result';
import { CreateSubjectResult } from './results/create-subject.result';
import { DeleteSubjectResult } from './results/delete-subject.result';
import { UpdateSubjectResult } from './results/update-subject.result';
import { SingleStudentDetailsResult } from './results/single-student-details.result';
import { SingleTeacherDetailsResult } from './results/single-teacher-details.result';
import { StudentDetailsResult } from './results/student-details.result';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Controller('bff/admin')
@ApiTags('BFF - Admin')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard, PoliciesGuard)
export class BffAdminController {
  constructor(private readonly bffAdminService: BffAdminService) {}

  @Get('classrooms-view')
  @ClassroomsViewSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getClassroomsView(@GetCurrentUserId() userId: string) {
    const data = await this.bffAdminService.getClassroomsViewData(userId);
    return new AdminClassroomsViewResult(data);
  }

  @Get('teachers-view')
  @TeachersViewSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getTeachersView(@GetCurrentUserId() userId: string) {
    const data = await this.bffAdminService.getTeachersViewData(userId);
    return new AdminTeachersViewResult(data);
  }

  @Get('students-view')
  @StudentsViewSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getStudentsView(@GetCurrentUserId() userId: string) {
    const data = await this.bffAdminService.getStudentsViewData(userId);
    return new AdminStudentsViewResult(data);
  }

  @Get('subjects-view')
  @SubjectsViewSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getSubjectsView(@GetCurrentUserId() userId: string) {
    const data = await this.bffAdminService.getSubjectsViewData(userId);
    return new AdminSubjectsViewResult(data);
  }

  @Post('subjects')
  @CreateSubjectSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async createSubject(
    @GetCurrentUserId() userId: string,
    @Body() createSubjectDto: CreateSubjectDto,
  ) {
    const data = await this.bffAdminService.createSubject(userId, createSubjectDto);
    return new CreateSubjectResult(data);
  }

  @Put('subjects/:subjectId')
  @UpdateSubjectSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async updateSubject(
    @GetCurrentUserId() userId: string,
    @Param('subjectId') subjectId: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ) {
    const data = await this.bffAdminService.updateSubject(userId, subjectId, updateSubjectDto);
    return new UpdateSubjectResult(data);
  }

  @Delete('subjects/:subjectId')
  @DeleteSubjectSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async deleteSubject(@GetCurrentUserId() userId: string, @Param('subjectId') subjectId: string) {
    const data = await this.bffAdminService.deleteSubject(userId, subjectId);
    return new DeleteSubjectResult(data);
  }

  @Get('teacher/:teacherId')
  @SingleTeacherDetailsParam()
  @SingleTeacherDetailsResponse()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getSingleTeacherDetails(
    @GetCurrentUserId() userId: string,
    @Param('teacherId') teacherId: string,
  ) {
    const data = await this.bffAdminService.getSingleTeacherDetails(userId, teacherId);
    return new SingleTeacherDetailsResult(data);
  }

  @Get('classroom/:classroomId/details')
  @ClassroomDetailsParam()
  @ClassroomDetailsPageQuery()
  @ClassroomDetailsLimitQuery()
  @ClassroomDetailsResponse()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getClassroomDetails(
    @GetCurrentUserId() userId: string,
    @Param('classroomId') classroomId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    const data = await this.bffAdminService.getClassroomDetailsData(
      userId,
      classroomId,
      pageNumber,
      limitNumber,
    );
    return new AdminClassroomDetailsResult(data);
  }

  @Get('students')
  @StudentDetailsPageQuery()
  @StudentDetailsLimitQuery()
  @StudentDetailsClassroomQuery()
  @StudentDetailsSearchQuery()
  @StudentDetailsResponse()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getStudentDetails(
    @GetCurrentUserId() userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('classroomId') classroomId?: string,
    @Query('search') search?: string,
  ) {
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 20;

    const data = await this.bffAdminService.getStudentDetailsData(
      userId,
      pageNumber,
      limitNumber,
      classroomId,
      search,
    );
    return new StudentDetailsResult(data);
  }

  @Get('student/:studentId')
  @SingleStudentDetailsParam()
  @SingleStudentDetailsResponse()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getSingleStudentDetails(
    @GetCurrentUserId() userId: string,
    @Param('studentId') studentId: string,
  ) {
    const data = await this.bffAdminService.getSingleStudentDetails(userId, studentId);
    return new SingleStudentDetailsResult(data);
  }
}
