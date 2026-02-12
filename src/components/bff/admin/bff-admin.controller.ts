import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Res,
  Header,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiParam } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../../common/decorators';
import { LogActivity } from '../../../common/decorators/log-activity.decorator';
import { ActivityLogInterceptor } from '../../../common/interceptors/activity-log.interceptor';
import { StrategyEnum } from '../../auth/strategies';
import { AccessTokenGuard } from '../../auth/strategies/jwt/guards';
import { CheckPolicies, PoliciesGuard } from '../../roles-manager';
import { ManageStudentPolicyHandler } from '../../students/policies';
import { BffAdminService } from './bff-admin.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import {
  AdminsViewSwagger,
  ClassroomDetailsLimitQuery,
  ClassroomDetailsPageQuery,
  ClassroomDetailsParam,
  ClassroomDetailsResponse,
  ClassroomsViewSwagger,
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
  LevelsViewSwagger,
  DashboardSummarySwagger,
} from './bff-admin.swagger';
import { AdminAdminsViewResult } from './results/admin-admins-view.result';
import { AdminClassroomDetailsResult } from './results/admin-classroom-details.result';
import { AdminClassroomsViewResult } from './results/admin-classrooms-view.result';
import { AdminDepartmentsViewResult } from './results/admin-departments-view.result';
import { AdminStudentsViewResult } from './results/admin-students-view.result';
import { AdminSubjectsViewResult } from './results/admin-subjects-view.result';
import { AdminTeachersViewResult } from './results/admin-teachers-view.result';
import { AdminLevelsViewResult } from './results/admin-levels-view.result';
import { SingleStudentDetailsResult } from './results/single-student-details.result';
import { SingleTeacherDetailsResult } from './results/single-teacher-details.result';
import { StudentDetailsResult } from './results/student-details.result';
import { DashboardSummaryResult } from './results/dashboard-summary.result';
import { AdminTopClassChampionsResult } from './results/admin-top-class-champions.result';

@Controller('bff/admin')
@ApiTags('BFF - Admin')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard, PoliciesGuard)
export class BffAdminController {
  constructor(private readonly bffAdminService: BffAdminService) {}

  @Get('dashboard-summary')
  @DashboardSummarySwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getDashboardSummary(@GetCurrentUserId() userId: string) {
    const data = await this.bffAdminService.getDashboardSummaryData(userId);
    return new DashboardSummaryResult(data);
  }

  @Get('recent-activities')
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getRecentActivities(
    @GetCurrentUserId() userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('action') action?: string,
    @Query('category') category?: string,
    @Query('severity') severity?: string,
    @Query('userId') activityUserId?: string,
  ) {
    const data = await this.bffAdminService.getRecentActivities(userId, {
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
      action,
      category,
      severity,
      userId: activityUserId,
    });
    return data;
  }

  @Get('classrooms-view')
  @ClassroomsViewSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getClassroomsView(@GetCurrentUserId() userId: string) {
    const data = await this.bffAdminService.getClassroomsViewData(userId);
    return new AdminClassroomsViewResult(data);
  }

  @Get('top-class-champions')
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getTopClassChampions(@GetCurrentUserId() userId: string) {
    const data = await this.bffAdminService.getTopClassChampions(userId);
    return new AdminTopClassChampionsResult(data);
  }

  @Get('teachers-view')
  @TeachersViewSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getTeachersView(
    @GetCurrentUserId() userId: string,
    @Query('academicSessionId') academicSessionId?: string,
  ) {
    const data = await this.bffAdminService.getTeachersViewData(userId, academicSessionId);
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
  async getStudentsView(
    @GetCurrentUserId() userId: string,
    @Query('academicSessionId') academicSessionId?: string,
  ) {
    const data = await this.bffAdminService.getStudentsViewData(userId, academicSessionId);
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
  @CheckPolicies(new ManageStudentPolicyHandler())
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'CREATE_SUBJECT',
    entityType: 'SUBJECT',
    description: 'Admin created a new subject',
    category: 'ADMINISTRATION',
  })
  async createSubject(
    @GetCurrentUserId() userId: string,
    @Body() createSubjectDto: CreateSubjectDto,
  ) {
    const data = await this.bffAdminService.createSubject(userId, createSubjectDto);
    return data;
  }

  @Get('subject/:subjectId/details')
  @ApiParam({ name: 'subjectId', description: 'Subject UUID' })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getSubjectDetails(
    @GetCurrentUserId() userId: string,
    @Param('subjectId') subjectId: string,
  ) {
    return this.bffAdminService.getSubjectDetails(userId, subjectId);
  }

  @Get('subject/:subjectId/class/:classArmId/assessments')
  @ApiParam({ name: 'subjectId', description: 'Subject UUID' })
  @ApiParam({ name: 'classArmId', description: 'Class Arm UUID' })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getSubjectClassAssessments(
    @GetCurrentUserId() userId: string,
    @Param('subjectId') subjectId: string,
    @Param('classArmId') classArmId: string,
  ) {
    return this.bffAdminService.getClassAssessments(userId, subjectId, classArmId);
  }

  @Get('subject/:subjectId/class/:classArmId/broadsheet')
  @ApiParam({ name: 'subjectId', description: 'Subject UUID' })
  @ApiParam({ name: 'classArmId', description: 'Class Arm UUID' })
  @CheckPolicies(new ManageStudentPolicyHandler())
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async downloadBroadsheet(
    @GetCurrentUserId() userId: string,
    @Param('subjectId') subjectId: string,
    @Param('classArmId') classArmId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.bffAdminService.generateBroadsheet(userId, subjectId, classArmId);
    res.set({
      'Content-Disposition': 'attachment; filename="broadsheet.xlsx"',
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    res.send(buffer);
  }

  @Patch('subjects/:subjectId')
  @ApiParam({ name: 'subjectId', description: 'Subject UUID' })
  @CheckPolicies(new ManageStudentPolicyHandler())
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'UPDATE_SUBJECT',
    entityType: 'SUBJECT',
    description: 'Admin updated a subject',
    category: 'ADMINISTRATION',
  })
  async updateSubject(
    @GetCurrentUserId() userId: string,
    @Param('subjectId') subjectId: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ) {
    return this.bffAdminService.updateSubject(userId, subjectId, updateSubjectDto);
  }

  @Delete('subjects/:subjectId')
  @ApiParam({ name: 'subjectId', description: 'Subject UUID' })
  @CheckPolicies(new ManageStudentPolicyHandler())
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'DELETE_SUBJECT',
    entityType: 'SUBJECT',
    description: 'Admin deleted a subject',
    category: 'ADMINISTRATION',
  })
  async deleteSubject(
    @GetCurrentUserId() userId: string,
    @Param('subjectId') subjectId: string,
  ) {
    return this.bffAdminService.deleteSubject(userId, subjectId);
  }

  // Department endpoints
  @Get('departments-view')
  @DepartmentsViewSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getDepartmentsView(@GetCurrentUserId() userId: string) {
    const data = await this.bffAdminService.getDepartmentsViewData(userId);
    return new AdminDepartmentsViewResult(data);
  }

  // Level endpoints
  @Get('levels-view')
  @LevelsViewSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getLevelsView(@GetCurrentUserId() userId: string) {
    const data = await this.bffAdminService.getLevelsViewData(userId);
    return new AdminLevelsViewResult(data);
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

  @Get('classroom-by-slug/:slug/details')
  @ApiParam({ name: 'slug', description: 'Classroom slug (e.g., jss1-a-2024-2025)' })
  @ClassroomDetailsPageQuery()
  @ClassroomDetailsLimitQuery()
  @ClassroomDetailsResponse()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getClassroomDetailsBySlug(
    @GetCurrentUserId() userId: string,
    @Param('slug') slug: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    const data = await this.bffAdminService.getClassroomDetailsDataBySlug(
      userId,
      slug,
      pageNumber,
      limitNumber,
    );
    return new AdminClassroomDetailsResult(data);
  }

  @Get('classroom-details')
  @ApiQuery({
    name: 'level',
    required: true,
    type: String,
    description: 'Level name (e.g., JSS1, JSS2, SS1)',
  })
  @ApiQuery({
    name: 'classArm',
    required: true,
    type: String,
    description: 'Class arm name (e.g., A, B, Alpha)',
  })
  @ClassroomDetailsPageQuery()
  @ClassroomDetailsLimitQuery()
  @ClassroomDetailsResponse()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getClassroomDetailsByLevelAndArm(
    @GetCurrentUserId() userId: string,
    @Query('level') level: string,
    @Query('classArm') classArm: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    const data = await this.bffAdminService.getClassroomDetailsByLevelAndArm(
      userId,
      level,
      classArm,
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

  // Classroom endpoints
  @Post('classrooms')
  @CheckPolicies(new ManageStudentPolicyHandler())
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'CREATE_CLASSROOM',
    entityType: 'CLASSROOM',
    description: 'Admin created a new classroom',
    category: 'ADMINISTRATION',
  })
  async createClassroom(
    @GetCurrentUserId() userId: string,
    @Body() createClassroomDto: CreateClassroomDto,
  ) {
    const data = await this.bffAdminService.createClassroom(userId, createClassroomDto);
    return data;
  }
}
