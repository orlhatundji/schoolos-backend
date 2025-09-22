import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../../common/decorators';
import { LogActivity } from '../../../common/decorators/log-activity.decorator';
import { ActivityLogInterceptor } from '../../../common/interceptors/activity-log.interceptor';
import { StrategyEnum } from '../../auth/strategies';
import { AccessTokenGuard } from '../../auth/strategies/jwt/guards/access-token.guard';
import {
  CreateStudentAssessmentScoreDto,
  UpdateStudentAssessmentScoreDto,
  BulkCreateStudentAssessmentScoreDto,
  BulkUpdateStudentAssessmentScoreDto,
  UpsertStudentAssessmentScoreDto,
  MarkClassAttendanceDto,
  MarkSubjectAttendanceDto,
} from './dto';
import {
  ClassDetailsResult,
  ClassStudentsResult,
  SubjectAssessmentScoresResult,
  TeacherActivitiesResult,
  TeacherClassesResult,
  TeacherDashboardResult,
  TeacherEventsResult,
  TeacherProfileResult,
  TeacherSubjectsResult,
  BulkStudentAssessmentScoreResultClass,
  ClassAttendanceResultResponse,
  SubjectAttendanceResultResponse,
} from './results';
import { TeacherService } from './teacher.service';
import { TeacherDashboardSwagger } from './teacher.swagger';

@Controller('teacher')
@ApiTags('Teacher')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('dashboard')
  @TeacherDashboardSwagger()
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_TEACHER_DASHBOARD',
    entityType: 'TEACHER_DASHBOARD',
    description: 'Teacher viewed dashboard',
    category: 'TEACHER',
  })
  async getTeacherDashboard(@GetCurrentUserId() userId: string) {
    const data = await this.teacherService.getTeacherDashboardData(userId);
    return new TeacherDashboardResult(data);
  }

  @Get('classes')
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of classes to return',
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_TEACHER_CLASSES',
    entityType: 'TEACHER_CLASSES',
    description: 'Teacher viewed classes',
    category: 'TEACHER',
  })
  async getTeacherClasses(@GetCurrentUserId() userId: string) {
    const classes = await this.teacherService.getTeacherClasses(userId);
    return new TeacherClassesResult(classes);
  }

  @Get('subjects')
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_TEACHER_SUBJECTS',
    entityType: 'TEACHER_SUBJECTS',
    description: 'Teacher viewed subjects',
    category: 'TEACHER',
  })
  async getTeacherSubjects(@GetCurrentUserId() userId: string) {
    const subjects = await this.teacherService.getTeacherSubjects(userId);
    return new TeacherSubjectsResult(subjects);
  }

  @Get('subject-assignments')
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of subject assignments to return',
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_TEACHER_SUBJECT_ASSIGNMENTS',
    entityType: 'TEACHER_SUBJECT_ASSIGNMENTS',
    description: 'Teacher viewed subject assignments',
    category: 'TEACHER',
  })
  async getTeacherSubjectAssignments(@GetCurrentUserId() userId: string) {
    const assignments = await this.teacherService.getTeacherSubjectAssignments(userId);
    return new TeacherClassesResult(assignments);
  }

  @Get('class-details')
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
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_CLASS_DETAILS',
    entityType: 'CLASS_DETAILS',
    description: 'Teacher viewed class details',
    category: 'TEACHER',
  })
  async getClassDetails(
    @GetCurrentUserId() userId: string,
    @Query('level') level: string,
    @Query('classArm') classArm: string,
  ) {
    const classDetails = await this.teacherService.getClassDetails(userId, level, classArm);
    return new ClassDetailsResult(classDetails);
  }

  @Get('class-arm-id')
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
  @ApiOperation({ summary: 'Get class arm ID for subject teachers' })
  @ApiResponse({
    status: 200,
    description: 'Class arm ID retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Class arm not found',
  })
  async getClassArmId(
    @GetCurrentUserId() userId: string,
    @Query('level') level: string,
    @Query('classArm') classArm: string,
  ) {
    const classArmId = await this.teacherService.getClassArmId(userId, level, classArm);
    return {
      success: true,
      message: 'Class arm ID retrieved successfully',
      data: classArmId,
    };
  }

  @Get('class-students')
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
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_CLASS_STUDENTS',
    entityType: 'CLASS_STUDENTS',
    description: 'Teacher viewed class students',
    category: 'TEACHER',
  })
  async getClassStudents(
    @GetCurrentUserId() userId: string,
    @Query('level') level: string,
    @Query('classArm') classArm: string,
  ) {
    const students = await this.teacherService.getClassStudents(userId, level, classArm);
    return new ClassStudentsResult(students);
  }

  @Get('subject-assessment-scores')
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
  @ApiQuery({
    name: 'subjectName',
    required: true,
    type: String,
    description: 'Subject name (e.g., Mathematics, English)',
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_SUBJECT_ASSESSMENT_SCORES',
    entityType: 'SUBJECT_ASSESSMENT_SCORES',
    description: 'Teacher viewed subject assessment scores',
    category: 'TEACHER',
  })
  async getSubjectAssessmentScores(
    @GetCurrentUserId() userId: string,
    @Query('level') level: string,
    @Query('classArm') classArm: string,
    @Query('subjectName') subjectName: string,
  ) {
    const scores = await this.teacherService.getSubjectAssessmentScores(
      userId,
      level,
      classArm,
      subjectName,
    );
    return new SubjectAssessmentScoresResult(scores);
  }

  @Get('activities')
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of activities to return (default: 10)',
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_TEACHER_ACTIVITIES',
    entityType: 'TEACHER_ACTIVITIES',
    description: 'Teacher viewed recent activities',
    category: 'TEACHER',
  })
  async getTeacherActivities(@GetCurrentUserId() userId: string, @Query('limit') limit?: number) {
    const activities = await this.teacherService.getRecentActivities(userId, limit || 10);
    return new TeacherActivitiesResult(activities);
  }

  @Get('events')
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days ahead to fetch events (default: 7)',
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_TEACHER_EVENTS',
    entityType: 'TEACHER_EVENTS',
    description: 'Teacher viewed upcoming events',
    category: 'TEACHER',
  })
  async getTeacherEvents(@GetCurrentUserId() userId: string, @Query('days') days?: number) {
    const events = await this.teacherService.getUpcomingEvents(userId, days || 7);
    return new TeacherEventsResult(events);
  }

  @Get('profile')
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_TEACHER_PROFILE',
    entityType: 'TEACHER_PROFILE',
    description: 'Teacher viewed profile',
    category: 'TEACHER',
  })
  async getTeacherProfile(@GetCurrentUserId() userId: string) {
    const profile = await this.teacherService.getTeacherProfile(userId);
    return new TeacherProfileResult(profile);
  }

  // Student Assessment Score Management Endpoints
  @Post('student-assessment-scores')
  @ApiOperation({ summary: 'Create a new student assessment score' })
  @ApiResponse({ status: 201, description: 'Assessment score created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized to teach this subject' })
  @ApiResponse({ status: 404, description: 'Student or subject not found' })
  @LogActivity({
    action: 'CREATE_STUDENT_ASSESSMENT_SCORE',
    entityType: 'STUDENT_ASSESSMENT_SCORE',
    description: 'Teacher created student assessment score',
    category: 'TEACHER',
  })
  async createStudentAssessmentScore(
    @GetCurrentUserId() userId: string,
    @Body() createDto: CreateStudentAssessmentScoreDto,
  ) {
    const result = await this.teacherService.createStudentAssessmentScore(userId, createDto);
    return {
      success: true,
      message: 'Assessment score created successfully',
      data: result,
    };
  }

  @Patch('student-assessment-scores/:id')
  @ApiOperation({ summary: 'Update an existing student assessment score' })
  @ApiResponse({ status: 200, description: 'Assessment score updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized to modify this assessment' })
  @ApiResponse({ status: 404, description: 'Assessment score not found' })
  @LogActivity({
    action: 'UPDATE_STUDENT_ASSESSMENT_SCORE',
    entityType: 'STUDENT_ASSESSMENT_SCORE',
    description: 'Teacher updated student assessment score',
    category: 'TEACHER',
  })
  async updateStudentAssessmentScore(
    @GetCurrentUserId() userId: string,
    @Param('id') assessmentId: string,
    @Body() updateDto: UpdateStudentAssessmentScoreDto,
  ) {
    const result = await this.teacherService.updateStudentAssessmentScore(
      userId,
      assessmentId,
      updateDto,
    );
    return {
      success: true,
      message: 'Assessment score updated successfully',
      data: result,
    };
  }

  @Delete('student-assessment-scores/:id')
  @ApiOperation({ summary: 'Delete a student assessment score' })
  @ApiResponse({ status: 200, description: 'Assessment score deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized to delete this assessment' })
  @ApiResponse({ status: 404, description: 'Assessment score not found' })
  @LogActivity({
    action: 'DELETE_STUDENT_ASSESSMENT_SCORE',
    entityType: 'STUDENT_ASSESSMENT_SCORE',
    description: 'Teacher deleted student assessment score',
    category: 'TEACHER',
  })
  async deleteStudentAssessmentScore(
    @GetCurrentUserId() userId: string,
    @Param('id') assessmentId: string,
  ) {
    const result = await this.teacherService.deleteStudentAssessmentScore(userId, assessmentId);
    return {
      success: true,
      message: result.message,
      data: result.deletedAssessment,
    };
  }

  // Bulk Student Assessment Score Management Endpoints
  @Post('student-assessment-scores/batch')
  @ApiOperation({ summary: 'Create multiple student assessment scores' })
  @ApiResponse({
    status: 201,
    description: 'Assessment scores creation completed',
    type: BulkStudentAssessmentScoreResultClass,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized to teach subjects' })
  @LogActivity({
    action: 'BULK_CREATE_STUDENT_ASSESSMENT_SCORES',
    entityType: 'STUDENT_ASSESSMENT_SCORES',
    description: 'Teacher created multiple student assessment scores',
    category: 'TEACHER',
  })
  async bulkCreateStudentAssessmentScores(
    @GetCurrentUserId() userId: string,
    @Body() bulkCreateDto: BulkCreateStudentAssessmentScoreDto,
  ) {
    const result = await this.teacherService.bulkCreateStudentAssessmentScores(
      userId,
      bulkCreateDto,
    );
    return BulkStudentAssessmentScoreResultClass.from(result, {
      status: 201,
      message: `Creation completed. ${result.success.length} successful, ${result.failed.length} failed.`,
    });
  }

  @Patch('student-assessment-scores/batch')
  @ApiOperation({ summary: 'Update multiple student assessment scores' })
  @ApiResponse({
    status: 200,
    description: 'Assessment scores update completed',
    type: BulkStudentAssessmentScoreResultClass,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not authorized to modify assessment scores',
  })
  @LogActivity({
    action: 'BULK_UPDATE_STUDENT_ASSESSMENT_SCORES',
    entityType: 'STUDENT_ASSESSMENT_SCORES',
    description: 'Teacher updated multiple student assessment scores',
    category: 'TEACHER',
  })
  async bulkUpdateStudentAssessmentScores(
    @GetCurrentUserId() userId: string,
    @Body() bulkUpdateDto: BulkUpdateStudentAssessmentScoreDto,
  ) {
    const result = await this.teacherService.bulkUpdateStudentAssessmentScores(
      userId,
      bulkUpdateDto,
    );
    return BulkStudentAssessmentScoreResultClass.from(result, {
      status: 200,
      message: `Update completed. ${result.success.length} successful, ${result.failed.length} failed.`,
    });
  }

  @Put('student-assessment-scores/batch')
  @ApiOperation({ summary: 'Create or update multiple student assessment scores' })
  @ApiResponse({
    status: 200,
    description: 'Assessment scores upsert completed',
    type: BulkStudentAssessmentScoreResultClass,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not authorized to manage assessment scores',
  })
  @LogActivity({
    action: 'UPSERT_STUDENT_ASSESSMENT_SCORES',
    entityType: 'STUDENT_ASSESSMENT_SCORES',
    description: 'Teacher created or updated multiple student assessment scores',
    category: 'TEACHER',
  })
  async upsertStudentAssessmentScores(
    @GetCurrentUserId() userId: string,
    @Body() upsertDto: UpsertStudentAssessmentScoreDto,
  ) {
    const result = await this.teacherService.upsertStudentAssessmentScores(userId, upsertDto);
    return BulkStudentAssessmentScoreResultClass.from(result, {
      status: 200,
      message: `Upsert completed. ${result.success.length} successful, ${result.failed.length} failed.`,
    });
  }

  // Attendance Management Endpoints

  @Post('attendance/class')
  @ApiOperation({ summary: 'Mark class attendance by class teacher' })
  @ApiResponse({
    status: 201,
    description: 'Class attendance marked successfully',
    type: ClassAttendanceResultResponse,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not authorized to mark attendance for this class',
  })
  @ApiResponse({ status: 404, description: 'Class arm, academic session, or term not found' })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'MARK_CLASS_ATTENDANCE',
    entityType: 'STUDENT_ATTENDANCE',
    description: 'Teacher marked class attendance',
    category: 'TEACHER',
  })
  async markClassAttendance(
    @GetCurrentUserId() userId: string,
    @Body() markAttendanceDto: MarkClassAttendanceDto,
  ) {
    const result = await this.teacherService.markClassAttendance(userId, markAttendanceDto);
    return ClassAttendanceResultResponse.from(result, {
      status: 201,
      message: 'Class attendance marked successfully',
    });
  }

  @Post('attendance/subject')
  @ApiOperation({ summary: 'Mark subject attendance by subject teacher' })
  @ApiResponse({
    status: 201,
    description: 'Subject attendance marked successfully',
    type: SubjectAttendanceResultResponse,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not authorized to mark attendance for this subject and class',
  })
  @ApiResponse({
    status: 404,
    description: 'Subject, class arm, academic session, or term not found',
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'MARK_SUBJECT_ATTENDANCE',
    entityType: 'STUDENT_ATTENDANCE',
    description: 'Teacher marked subject attendance',
    category: 'TEACHER',
  })
  async markSubjectAttendance(
    @GetCurrentUserId() userId: string,
    @Body() markAttendanceDto: MarkSubjectAttendanceDto,
  ) {
    const result = await this.teacherService.markSubjectAttendance(userId, markAttendanceDto);
    return SubjectAttendanceResultResponse.from(result, {
      status: 201,
      message: 'Subject attendance marked successfully',
    });
  }

  @Get('academic-session')
  @ApiOperation({ summary: 'Get current academic session and term' })
  @ApiResponse({
    status: 200,
    description: 'Current academic session and term retrieved successfully',
  })
  async getCurrentAcademicSession(@GetCurrentUserId() userId: string) {
    const result = await this.teacherService.getCurrentAcademicSession(userId);
    return {
      success: true,
      message: 'Current academic session retrieved successfully',
      data: result,
    };
  }

  @Get('attendance/status')
  @ApiOperation({ summary: 'Check if attendance has been taken for a class on a specific date' })
  @ApiResponse({
    status: 200,
    description: 'Attendance status retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not authorized to check attendance for this class',
  })
  @ApiResponse({ status: 404, description: 'Class arm not found' })
  async checkClassAttendanceStatus(
    @GetCurrentUserId() userId: string,
    @Query('classArmId') classArmId: string,
    @Query('date') date: string,
  ) {
    const result = await this.teacherService.checkClassAttendanceStatus(userId, classArmId, date);
    return {
      success: true,
      message: 'Attendance status retrieved successfully',
      data: result,
    };
  }

  @Get('attendance/data')
  @ApiOperation({ summary: 'Get existing attendance data for a class on a specific date' })
  @ApiResponse({
    status: 200,
    description: 'Attendance data retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not authorized to view attendance for this class',
  })
  @ApiResponse({ status: 404, description: 'Class arm not found' })
  async getClassAttendanceData(
    @GetCurrentUserId() userId: string,
    @Query('classArmId') classArmId: string,
    @Query('date') date: string,
  ) {
    const result = await this.teacherService.getClassAttendanceData(userId, classArmId, date);
    return {
      success: true,
      message: 'Attendance data retrieved successfully',
      data: result,
    };
  }
}
