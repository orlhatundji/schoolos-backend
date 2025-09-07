import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../common/decorators';
import { StrategyEnum } from '../auth/strategies';
import { AdminTeacherService } from './admin-teacher.service';
import { CreateTeacherDto, QueryTeachersDto, UpdateTeacherDto } from './dto';
import {
  TeacherDetailsResult,
  TeacherListResult,
  TeacherResult,
  TeacherStatsResult,
} from './results';

@Controller('admin/teachers')
@ApiTags('Admin - Teachers')
@ApiBearerAuth(StrategyEnum.JWT)
export class AdminTeacherController {
  constructor(private readonly adminTeacherService: AdminTeacherService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Teacher created successfully',
    type: TeacherResult,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email or phone number already exists',
  })
  async createTeacher(
    @GetCurrentUserId() userId: string,
    @Body() createTeacherDto: CreateTeacherDto,
  ): Promise<TeacherResult> {
    return this.adminTeacherService.createTeacher(userId, createTeacherDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teachers retrieved successfully',
    type: TeacherListResult,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'stateOfOrigin', required: false, type: String })
  @ApiQuery({ name: 'assignedClassId', required: false, type: String })
  @ApiQuery({ name: 'gender', required: false, enum: ['MALE', 'FEMALE'] })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE'] })
  @ApiQuery({
    name: 'employmentType',
    required: false,
    enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT'],
  })
  @ApiQuery({ name: 'departmentId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  async getTeachers(
    @GetCurrentUserId() userId: string,
    @Query() queryDto: QueryTeachersDto,
  ): Promise<TeacherListResult> {
    return this.adminTeacherService.getTeachers(userId, queryDto);
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher statistics retrieved successfully',
    type: TeacherStatsResult,
  })
  async getTeacherStats(@GetCurrentUserId() userId: string): Promise<TeacherStatsResult> {
    return this.adminTeacherService.getTeacherStats(userId);
  }

  @Get(':teacherId')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher details retrieved successfully',
    type: TeacherDetailsResult,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher not found',
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  async getTeacherById(
    @GetCurrentUserId() userId: string,
    @Param('teacherId') teacherId: string,
  ): Promise<TeacherDetailsResult> {
    return this.adminTeacherService.getTeacherById(userId, teacherId);
  }

  @Put(':teacherId')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teacher updated successfully',
    type: TeacherResult,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email or phone number already exists',
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  async updateTeacher(
    @GetCurrentUserId() userId: string,
    @Param('teacherId') teacherId: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
  ): Promise<TeacherResult> {
    return this.adminTeacherService.updateTeacher(userId, teacherId, updateTeacherDto);
  }

  @Delete(':teacherId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Teacher deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Teacher not found',
  })
  @ApiParam({ name: 'teacherId', description: 'Teacher ID' })
  async deleteTeacher(
    @GetCurrentUserId() userId: string,
    @Param('teacherId') teacherId: string,
  ): Promise<void> {
    return this.adminTeacherService.deleteTeacher(userId, teacherId);
  }
}
