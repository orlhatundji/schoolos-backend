import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { StrategyEnum } from '../auth/strategies';
import { CheckPolicies, PoliciesGuard } from '../roles-manager';
import { UserMessages } from '../users/results';
import { CreateStudentDto, StudentQueryDto, UpdateStudentDto, UpdateStudentStatusDto } from './dto';
import {
  ManageStudentPolicyHandler,
  ReadStudentPolicyHandler,
  UpdateStudentPolicyHandler,
} from './policies';
import {
  StudentListResult,
  StudentMessages,
  StudentOverviewResult,
  StudentResult,
} from './results';
import { StudentsService } from './students.service';

@Controller('students')
@ApiTags('Student')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(PoliciesGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: StudentResult,
    description: StudentMessages.SUCCESS.STUDENT_CREATED_SUCCESSFULLY,
  })
  @ApiBadRequestResponse({
    description: UserMessages.FAILURE.USER_EXISTS,
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async create(@Body() createStudentDto: CreateStudentDto, @Request() req: any) {
    // Extract schoolId from the authenticated user's context
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new Error('School ID not found in user context');
    }

    const student = await this.studentsService.create(createStudentDto, schoolId);

    return StudentResult.from(student, {
      status: HttpStatus.CREATED,
      message: StudentMessages.SUCCESS.STUDENT_CREATED_SUCCESSFULLY,
    });
  }

  @Get('overview')
  @ApiResponse({
    status: HttpStatus.OK,
    type: StudentOverviewResult,
    description: 'Get student overview statistics',
  })
  @CheckPolicies(new ReadStudentPolicyHandler())
  async getOverview(@Request() req: any) {
    // Extract schoolId from the authenticated user's context
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new Error('School ID not found in user context');
    }

    const overview = await this.studentsService.getStudentOverview(schoolId);
    return StudentOverviewResult.from(overview, {
      status: HttpStatus.OK,
      message: 'Student overview retrieved successfully',
    });
  }

  @Get('levels')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get list of all levels with class arms for form dropdowns',
  })
  @CheckPolicies(new ReadStudentPolicyHandler())
  async getLevels(@Request() req: any) {
    // Extract schoolId from the authenticated user's context
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new Error('School ID not found in user context');
    }

    return this.studentsService.getLevelsWithClassArms(schoolId);
  }

  @Get('filters')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get available filter options for students',
  })
  @CheckPolicies(new ReadStudentPolicyHandler())
  async getFilters(@Request() req: any) {
    // Extract schoolId from the authenticated user's context
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new Error('School ID not found in user context');
    }

    return this.studentsService.getFilterOptions(schoolId);
  }

  @Get()
  @ApiResponse({
    status: HttpStatus.OK,
    type: StudentListResult,
    description: 'Get paginated list of students with filtering and search',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term',
  })
  @ApiQuery({
    name: 'levelId',
    required: false,
    type: String,
    description: 'Filter by level ID',
  })
  @ApiQuery({
    name: 'classArmId',
    required: false,
    type: String,
    description: 'Filter by class arm ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'inactive', 'suspended'],
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'gender',
    required: false,
    enum: ['MALE', 'FEMALE'],
    description: 'Filter by gender',
  })
  @ApiQuery({
    name: 'ageMin',
    required: false,
    type: Number,
    description: 'Minimum age filter',
  })
  @ApiQuery({
    name: 'ageMax',
    required: false,
    type: Number,
    description: 'Maximum age filter',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'age', 'level', 'studentId', 'status', 'createdAt'],
    description: 'Sort field',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order',
  })
  @CheckPolicies(new ReadStudentPolicyHandler())
  async findAll(@Query() query: StudentQueryDto, @Request() req: any) {
    // Extract schoolId from the authenticated user's context
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new Error('School ID not found in user context');
    }

    const studentsList = await this.studentsService.getStudentsList(query, schoolId);
    return StudentListResult.from(studentsList, {
      status: HttpStatus.OK,
      message: 'Students list retrieved successfully',
    });
  }

  @Get(':id')
  @ApiResponse({
    status: HttpStatus.OK,
    type: StudentResult,
    description: 'Get student by ID',
  })
  @CheckPolicies(new ReadStudentPolicyHandler())
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Put(':id')
  @ApiResponse({
    status: HttpStatus.OK,
    type: StudentResult,
    description: 'Update student information',
  })
  @CheckPolicies(new UpdateStudentPolicyHandler())
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Patch(':id/status')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Update student status',
  })
  @CheckPolicies(new UpdateStudentPolicyHandler())
  async updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateStudentStatusDto) {
    return this.studentsService.updateStudentStatus(id, updateStatusDto);
  }

  @Delete(':id')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Delete student',
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  remove(@Param('id') id: string) {
    return this.studentsService.remove(id);
  }
}
