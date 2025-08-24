import { Controller, Get, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../../common/decorators';
import { StrategyEnum } from '../../auth/strategies';
import { AccessTokenGuard } from '../../auth/strategies/jwt/guards';
import { CheckPolicies, PoliciesGuard } from '../../roles-manager';
import { ManageStudentPolicyHandler } from '../../students/policies';
import { BffAdminService } from './bff-admin.service';
import { AdminClassroomDetailsResult } from './results/admin-classroom-details.result';
import { AdminClassroomsViewResult } from './results/admin-classrooms-view.result';
import { SingleStudentDetailsResult } from './results/single-student-details.result';
import { StudentDetailsResult } from './results/student-details.result';

@Controller('bff/admin')
@ApiTags('BFF - Admin')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard, PoliciesGuard)
export class BffAdminController {
  constructor(private readonly bffAdminService: BffAdminService) {}

  @Get('classrooms-view')
  @ApiResponse({
    status: HttpStatus.OK,
    type: AdminClassroomsViewResult,
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getClassroomsView(@GetCurrentUserId() userId: string) {
    const data = await this.bffAdminService.getClassroomsViewData(userId);
    return new AdminClassroomsViewResult(data);
  }

  @Get('classroom/:classroomId/details')
  @ApiParam({
    name: 'classroomId',
    description: 'The ID of the classroom to get details for',
    type: 'string',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number for student pagination',
    type: 'number',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of students per page',
    type: 'number',
    required: false,
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: AdminClassroomDetailsResult,
    description:
      'Detailed information about a specific classroom including population, attendance, teachers, students, and top performers',
  })
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
  @ApiQuery({
    name: 'page',
    description: 'Page number for student pagination',
    type: 'number',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of students per page',
    type: 'number',
    required: false,
    example: 20,
  })
  @ApiQuery({
    name: 'classroomId',
    description: 'Filter students by classroom ID',
    type: 'string',
    required: false,
  })
  @ApiQuery({
    name: 'search',
    description: 'Search students by name, admission number, or student ID',
    type: 'string',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: StudentDetailsResult,
    description: 'Paginated list of student details with comprehensive information',
  })
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
  @ApiParam({
    name: 'studentId',
    description: 'The ID of the student to get details for',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SingleStudentDetailsResult,
    description: 'Detailed information about a specific student',
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getSingleStudentDetails(
    @GetCurrentUserId() userId: string,
    @Param('studentId') studentId: string,
  ) {
    const data = await this.bffAdminService.getSingleStudentDetails(userId, studentId);
    return new SingleStudentDetailsResult(data);
  }
}
