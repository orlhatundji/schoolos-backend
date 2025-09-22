import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StrategyEnum } from '../auth/strategies';
import { GetCurrentUserId } from '../../common/decorators';
import { AdminClassroomService } from './admin-classroom.service';

@Controller('admin/classrooms')
@ApiTags('Admin - Classrooms')
@ApiBearerAuth(StrategyEnum.JWT)
export class AdminClassroomController {
  constructor(private readonly adminClassroomService: AdminClassroomService) {}

  @Delete(':classroomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Classroom deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Classroom not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete classroom with students or teacher assignments',
  })
  @ApiParam({ name: 'classroomId', description: 'Classroom ID' })
  async deleteClassroom(
    @GetCurrentUserId() userId: string,
    @Param('classroomId') classroomId: string,
  ): Promise<void> {
    await this.adminClassroomService.deleteClassroom(userId, classroomId);
  }
}
