import { Controller, Get, Param, Post, Body, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../../common/decorators';
import { StrategyEnum } from '../../auth/strategies';
import { AccessTokenGuard } from '../../auth/strategies/jwt/guards';
import { CheckPolicies, PoliciesGuard } from '../../roles-manager';
import { ManageStudentPolicyHandler } from '../../students/policies';
import { BffAdminService } from './bff-admin.service';
import {
  AdminsViewSwagger,
  ArchiveDepartmentSwagger,
  ClassroomDetailsLimitQuery,
  ClassroomDetailsPageQuery,
  ClassroomDetailsParam,
  ClassroomDetailsResponse,
  ClassroomsViewSwagger,
  CreateDepartmentSwagger,
  CreateSubjectSwagger,
  DeleteSubjectSwagger,
  DepartmentsViewSwagger,
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
  UnarchiveDepartmentSwagger,
  UpdateDepartmentSwagger,
  UpdateSubjectSwagger,
  DeleteDepartmentSwagger,
  LevelsViewSwagger,
  CreateLevelSwagger,
  UpdateLevelSwagger,
  ArchiveLevelSwagger,
  UnarchiveLevelSwagger,
  DeleteLevelSwagger,
} from './bff-admin.swagger';
import { AdminAdminsViewResult } from './results/admin-admins-view.result';
import { AdminClassroomDetailsResult } from './results/admin-classroom-details.result';
import { AdminClassroomsViewResult } from './results/admin-classrooms-view.result';
import { AdminDepartmentsViewResult } from './results/admin-departments-view.result';
import { AdminStudentsViewResult } from './results/admin-students-view.result';
import { AdminSubjectsViewResult } from './results/admin-subjects-view.result';
import { AdminTeachersViewResult } from './results/admin-teachers-view.result';
import { AdminLevelsViewResult } from './results/admin-levels-view.result';
import { ArchiveDepartmentResult } from './results/archive-department.result';
import { CreateDepartmentResult } from './results/create-department.result';
import { CreateSubjectResult } from './results/create-subject.result';
import { DeleteSubjectResult } from './results/delete-subject.result';
import { UnarchiveDepartmentResult } from './results/unarchive-department.result';
import { UpdateDepartmentResult } from './results/update-department.result';
import { UpdateSubjectResult } from './results/update-subject.result';
import { SingleStudentDetailsResult } from './results/single-student-details.result';
import { SingleTeacherDetailsResult } from './results/single-teacher-details.result';
import { StudentDetailsResult } from './results/student-details.result';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { DeleteDepartmentResult } from './results/delete-department.result';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { CreateLevelResult } from './results/create-level.result';
import { UpdateLevelResult } from './results/update-level.result';
import { ArchiveLevelResult } from './results/archive-level.result';
import { UnarchiveLevelResult } from './results/unarchive-level.result';
import { DeleteLevelResult } from './results/delete-level.result';

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

  @Get('admins-view')
  @AdminsViewSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getAdminsView(@GetCurrentUserId() userId: string) {
    const data = await this.bffAdminService.getAdminsViewData(userId);
    return new AdminAdminsViewResult(data);
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

  // Department endpoints
  @Get('departments-view')
  @DepartmentsViewSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getDepartmentsView(@GetCurrentUserId() userId: string) {
    const data = await this.bffAdminService.getDepartmentsViewData(userId);
    return new AdminDepartmentsViewResult(data);
  }

  @Post('departments')
  @CreateDepartmentSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async createDepartment(
    @GetCurrentUserId() userId: string,
    @Body() createDepartmentDto: CreateDepartmentDto,
  ) {
    const data = await this.bffAdminService.createDepartment(userId, createDepartmentDto);
    return new CreateDepartmentResult(data);
  }

  @Put('departments/:departmentId')
  @UpdateDepartmentSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async updateDepartment(
    @GetCurrentUserId() userId: string,
    @Param('departmentId') departmentId: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    const data = await this.bffAdminService.updateDepartment(
      userId,
      departmentId,
      updateDepartmentDto,
    );
    return new UpdateDepartmentResult(data);
  }

  @Post('departments/:departmentId/archive')
  @ArchiveDepartmentSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async archiveDepartment(
    @GetCurrentUserId() userId: string,
    @Param('departmentId') departmentId: string,
  ) {
    const data = await this.bffAdminService.archiveDepartment(userId, departmentId);
    return new ArchiveDepartmentResult(data);
  }

  @Post('departments/:departmentId/unarchive')
  @UnarchiveDepartmentSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async unarchiveDepartment(
    @GetCurrentUserId() userId: string,
    @Param('departmentId') departmentId: string,
  ) {
    const data = await this.bffAdminService.unarchiveDepartment(userId, departmentId);
    return new UnarchiveDepartmentResult(data);
  }

  @Delete('departments/:departmentId')
  @DeleteDepartmentSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async deleteDepartment(
    @GetCurrentUserId() userId: string,
    @Param('departmentId') departmentId: string,
  ) {
    const data = await this.bffAdminService.deleteDepartment(userId, departmentId);
    return new DeleteDepartmentResult(data);
  }

  // Level endpoints
  @Get('levels-view')
  @LevelsViewSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getLevelsView(@GetCurrentUserId() userId: string) {
    const data = await this.bffAdminService.getLevelsViewData(userId);
    return new AdminLevelsViewResult(data);
  }

  @Post('levels')
  @CreateLevelSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async createLevel(@GetCurrentUserId() userId: string, @Body() createLevelDto: CreateLevelDto) {
    const data = await this.bffAdminService.createLevel(userId, createLevelDto);
    return new CreateLevelResult(data);
  }

  @Put('levels/:levelId')
  @UpdateLevelSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async updateLevel(
    @GetCurrentUserId() userId: string,
    @Param('levelId') levelId: string,
    @Body() updateLevelDto: UpdateLevelDto,
  ) {
    const data = await this.bffAdminService.updateLevel(userId, levelId, updateLevelDto);
    return new UpdateLevelResult(data);
  }

  @Post('levels/:levelId/archive')
  @ArchiveLevelSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async archiveLevel(@GetCurrentUserId() userId: string, @Param('levelId') levelId: string) {
    const data = await this.bffAdminService.archiveLevel(userId, levelId);
    return new ArchiveLevelResult(data);
  }

  @Post('levels/:levelId/unarchive')
  @UnarchiveLevelSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async unarchiveLevel(@GetCurrentUserId() userId: string, @Param('levelId') levelId: string) {
    const data = await this.bffAdminService.unarchiveLevel(userId, levelId);
    return new UnarchiveLevelResult(data);
  }

  @Delete('levels/:levelId')
  @DeleteLevelSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async deleteLevel(@GetCurrentUserId() userId: string, @Param('levelId') levelId: string) {
    const data = await this.bffAdminService.deleteLevel(userId, levelId);
    return new DeleteLevelResult(data);
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
