import { Controller, Delete, Get, Put, HttpCode, HttpStatus, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StrategyEnum } from '../auth/strategies';
import { GetCurrentUserId } from '../../common/decorators';
import { AdminClassroomService } from './admin-classroom.service';
import { UpdateClassroomDto } from '../bff/admin/dto/update-classroom.dto';

@Controller('admin/classrooms')
@ApiTags('Admin - Classrooms')
@ApiBearerAuth(StrategyEnum.JWT)
export class AdminClassroomController {
  constructor(private readonly adminClassroomService: AdminClassroomService) {}

  @Get(':classroomId')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Classroom details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Classroom not found',
  })
  @ApiParam({ name: 'classroomId', description: 'Classroom ID' })
  async getClassroom(
    @GetCurrentUserId() userId: string,
    @Param('classroomId') classroomId: string,
  ) {
    return this.adminClassroomService.getClassroom(userId, classroomId);
  }

  @Put(':classroomId')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Classroom updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Classroom not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid classroom data',
  })
  @ApiParam({ name: 'classroomId', description: 'Classroom ID' })
  async updateClassroom(
    @GetCurrentUserId() userId: string,
    @Param('classroomId') classroomId: string,
    @Body() updateClassroomDto: UpdateClassroomDto,
  ) {
    return this.adminClassroomService.updateClassroom(userId, classroomId, updateClassroomDto);
  }

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
