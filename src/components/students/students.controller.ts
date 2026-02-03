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
import {
  CreateStudentDto,
  StudentQueryDto,
  UpdateStudentDto,
  UpdateStudentStatusDto,
  TransferStudentClassDto,
} from './dto';
import { ImportStudentsDto, CopyClassroomsDto } from './dto/import-students.dto';
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
import { ActivityLogService } from '../../common/services/activity-log.service';

@Controller('students')
@ApiTags('Student')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(PoliciesGuard)
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Post()
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: StudentResult,
    description: StudentMessages.SUCCESS.STUDENT_CREATED_SUCCESSFULLY,
  })
  // @ApiBadRequestResponse({
  //   description: UserMessages.FAILURE.USER_EXISTS,
  // })
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

  @Get('levels/session/:sessionId')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get list of all levels with class arms for a specific session',
  })
  @CheckPolicies(new ReadStudentPolicyHandler())
  async getLevelsForSession(@Param('sessionId') sessionId: string, @Request() req: any) {
    // Extract schoolId from the authenticated user's context
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new Error('School ID not found in user context');
    }

    return this.studentsService.getLevelsWithClassArmsForSession(schoolId, sessionId);
  }

  @Get('debug/student-counts')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Debug endpoint to check student counts in database',
  })
  @CheckPolicies(new ReadStudentPolicyHandler())
  async debugStudentCounts(@Request() req: any) {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new Error('School ID not found in user context');
    }

    // Get current session
    const currentSession = await this.studentsService['prisma'].academicSession.findFirst({
      where: { schoolId, isCurrent: true },
    });

    if (!currentSession) {
      return { error: 'No current session found' };
    }

    // Get all class arms with student counts
    const classArms = await this.studentsService['prisma'].classArm.findMany({
      where: {
        schoolId,
        academicSessionId: currentSession.id,
        deletedAt: null,
      },
      include: {
        level: true,
        _count: {
          select: {
            classArmStudents: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    // Get total students in school
    const totalStudents = await this.studentsService['prisma'].student.count({
      where: {
        user: { schoolId },
        deletedAt: null,
      },
    });

    // Get total class arm students
    const totalClassArmStudents = await this.studentsService['prisma'].classArmStudent.count({
      where: {
        classArm: { schoolId, academicSessionId: currentSession.id },
        isActive: true,
      },
    });

    return {
      schoolId,
      currentSessionId: currentSession.id,
      currentSessionYear: currentSession.academicYear,
      totalStudents,
      totalClassArmStudents,
      classArms: classArms.map((ca) => ({
        id: ca.id,
        name: ca.name,
        level: ca.level.name,
        studentCount: ca._count.classArmStudents,
      })),
    };
  }

  @Get('levels/higher')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get higher levels for promotion based on source level',
  })
  @CheckPolicies(new ReadStudentPolicyHandler())
  async getHigherLevelsForPromotion(
    @Request() req: any,
    @Query('sourceLevelId') sourceLevelId: string,
  ) {
    // Extract schoolId from the authenticated user's context
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new Error('School ID not found in user context');
    }

    if (!sourceLevelId) {
      throw new Error('sourceLevelId is required');
    }

    return this.studentsService.getHigherLevelsForPromotion(schoolId, sourceLevelId);
  }

  @Get('class-arms')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get class arms for a specific academic session and level',
  })
  @CheckPolicies(new ReadStudentPolicyHandler())
  async getClassArmsBySessionLevel(
    @Request() req: any,
    @Query('academicSessionId') academicSessionId: string,
    @Query('levelId') levelId: string,
  ) {
    // Extract schoolId from the authenticated user's context
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new Error('School ID not found in user context');
    }

    if (!academicSessionId || !levelId) {
      throw new Error('academicSessionId and levelId are required');
    }

    return this.studentsService.getClassArmsBySessionLevel(schoolId, academicSessionId, levelId);
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

  @Patch(':id/transfer-class')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer student to different class arm',
  })
  @CheckPolicies(new UpdateStudentPolicyHandler())
  async transferStudentClass(
    @Param('id') id: string,
    @Body() transferDto: TransferStudentClassDto,
  ) {
    return this.studentsService.transferStudentClass(id, transferDto);
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

  // Class arm promotion endpoints
  @Post('class-arms/copy-from-previous-session')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Copy classrooms from previous session',
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async copyClassroomsFromPreviousSession(@Body() copyDto: CopyClassroomsDto, @Request() req: any) {
    const schoolId = req.user.schoolId;
    return this.studentsService.copyClassroomsFromPreviousSession(
      schoolId,
      copyDto.targetSessionId,
    );
  }

  @Get('class-arms/:classArmId/available-for-import')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get students available for import from source class arm',
  })
  @CheckPolicies(new ReadStudentPolicyHandler())
  async getStudentsForImport(
    @Param('classArmId') classArmId: string,
    @Query('targetSessionId') targetSessionId: string,
    @Query('targetClassArmId') targetClassArmId?: string,
  ) {
    return this.studentsService.getStudentsForImport(classArmId, targetSessionId, targetClassArmId);
  }

  @Post('class-arms/import-students')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Import selected students to target class arm',
  })
  @CheckPolicies(new ManageStudentPolicyHandler())
  async importStudentsToClassArm(@Body() importDto: ImportStudentsDto, @Request() req: any) {
    const result = await this.studentsService.importStudentsToClassArm(importDto);

    // Get class arm names for better description
    const targetClassArm = await this.studentsService.getClassArmName(importDto.targetClassArmId);
    const sourceClassArm = importDto.sourceClassArmId
      ? await this.studentsService.getClassArmName(importDto.sourceClassArmId)
      : null;

    // Log the import activity
    await this.activityLogService.logActivity({
      userId: req.user?.sub,
      schoolId: req.user?.schoolId,
      action: 'STUDENTS_IMPORTED',
      entityType: 'STUDENT',
      entityId: importDto.targetClassArmId,
      details: {
        targetClassArmId: importDto.targetClassArmId,
        sourceClassArmId: importDto.sourceClassArmId,
        studentIds: importDto.studentIds,
        importedCount: result.importedCount,
        skippedCount: result.skippedCount,
        targetClassArmName: targetClassArm,
        sourceClassArmName: sourceClassArm,
      },
      description: sourceClassArm
        ? `Imported ${result.importedCount} students from '${sourceClassArm}' to '${targetClassArm}'`
        : `Imported ${result.importedCount} students to '${targetClassArm}'`,
      category: 'STUDENT_MANAGEMENT',
      severity: 'INFO',
    });

    return result;
  }
}
