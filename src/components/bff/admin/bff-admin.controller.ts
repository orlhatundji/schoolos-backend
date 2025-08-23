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
}
