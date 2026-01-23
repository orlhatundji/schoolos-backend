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
  UpdateTeacherProfileDto,
  UpdateUserPreferencesDto,
  InitiateColorSchemePaymentDto,
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
  async getTeacherClasses(@GetCurrentUserId() userId: string) {
    const classes = await this.teacherService.getTeacherClasses(userId);
    return new TeacherClassesResult(classes);
  }

  @Get('subjects')
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
  async getTeacherSubjectAssignments(@GetCurrentUserId() userId: string) {
    const assignments = await this.teacherService.getTeacherSubjectAssignments(userId);
    return new TeacherClassesResult(assignments);
  }

  @Get('class-details')
  @ApiQuery({
    name: 'classArmId',
    required: true,
    type: String,
    description: 'Class arm ID',
  })
  async getClassDetails(
    @GetCurrentUserId() userId: string,
    @Query('classArmId') classArmId: string,
  ) {
    const classDetails = await this.teacherService.getClassDetails(userId, classArmId);
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
    name: 'classArmId',
    required: true,
    type: String,
    description: 'Class arm ID',
  })
  async getClassStudents(
    @GetCurrentUserId() userId: string,
    @Query('classArmId') classArmId: string,
  ) {
    const students = await this.teacherService.getClassStudents(userId, classArmId);
    return new ClassStudentsResult(students);
  }

  @Get('subject-assessment-scores')
  @ApiQuery({
    name: 'classArmId',
    required: true,
    type: String,
    description: 'Class arm ID',
  })
  @ApiQuery({
    name: 'subjectName',
    required: true,
    type: String,
    description: 'Subject name (e.g., Mathematics, English)',
  })
  async getSubjectAssessmentScores(
    @GetCurrentUserId() userId: string,
    @Query('classArmId') classArmId: string,
    @Query('subjectName') subjectName: string,
  ) {
    const scores = await this.teacherService.getSubjectAssessmentScores(
      userId,
      classArmId,
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
  async getTeacherEvents(@GetCurrentUserId() userId: string, @Query('days') days?: number) {
    const events = await this.teacherService.getUpcomingEvents(userId, days || 7);
    return new TeacherEventsResult(events);
  }

  @Get('profile')
  async getTeacherProfile(@GetCurrentUserId() userId: string) {
    const profile = await this.teacherService.getTeacherProfile(userId);
    return new TeacherProfileResult(profile);
  }

  @Put('profile')
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'UPDATE_TEACHER_PROFILE',
    entityType: 'TEACHER_PROFILE',
    description: 'Teacher updated profile',
    category: 'TEACHER',
  })
  @ApiOperation({ summary: 'Update teacher profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: TeacherProfileResult,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  @ApiResponse({ status: 409, description: 'Phone number or email already in use' })
  async updateTeacherProfile(
    @GetCurrentUserId() userId: string,
    @Body() updateData: UpdateTeacherProfileDto,
  ) {
    const profile = await this.teacherService.updateTeacherProfile(userId, updateData);
    return new TeacherProfileResult(profile);
  }

  @Put('change-password')
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'CHANGE_PASSWORD',
    entityType: 'TEACHER_PROFILE',
    description: 'Teacher changed password',
    category: 'TEACHER',
  })
  @ApiOperation({ summary: 'Change teacher password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Invalid current password' })
  async changePassword(
    @GetCurrentUserId() userId: string,
    @Body() passwordData: { oldPassword: string; newPassword: string },
  ) {
    await this.teacherService.changePassword(
      userId,
      passwordData.oldPassword,
      passwordData.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  @ApiResponse({ status: 200, description: 'User preferences retrieved successfully' })
  async getUserPreferences(@GetCurrentUserId() userId: string) {
    return this.teacherService.getUserPreferences(userId);
  }

  @Put('preferences')
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'UPDATE_USER_PREFERENCES',
    entityType: 'USER_PREFERENCES',
    description: 'Teacher updated preferences',
    category: 'TEACHER',
  })
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  async updateUserPreferences(
    @GetCurrentUserId() userId: string,
    @Body() preferences: UpdateUserPreferencesDto,
  ) {
    return this.teacherService.updateUserPreferences(userId, preferences);
  }

  @Post('color-scheme/payment/initiate')
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'INITIATE_COLOR_SCHEME_PAYMENT',
    entityType: 'COLOR_SCHEME_PAYMENT',
    description: 'Teacher initiated color scheme payment',
    category: 'TEACHER',
  })
  @ApiOperation({ summary: 'Initiate color scheme customization payment' })
  @ApiResponse({ status: 201, description: 'Payment initiated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({
    status: 409,
    description: 'Payment already exists or user already has custom colors',
  })
  async initiateColorSchemePayment(
    @GetCurrentUserId() userId: string,
    @Body() colorData: InitiateColorSchemePaymentDto,
  ) {
    return this.teacherService.initiateColorSchemePayment(userId, colorData);
  }

  @Get('color-scheme/payment/status')
  @ApiOperation({ summary: 'Get color scheme payment status' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved successfully' })
  async getColorSchemePaymentStatus(@GetCurrentUserId() userId: string) {
    return this.teacherService.getColorSchemePaymentStatus(userId);
  }

  @Post('color-scheme/payment/verify')
  @ApiOperation({ summary: 'Verify color scheme payment' })
  @ApiResponse({ status: 200, description: 'Payment verified successfully' })
  @ApiResponse({ status: 400, description: 'Payment verification failed' })
  async verifyColorSchemePayment(
    @GetCurrentUserId() userId: string,
    @Body() body: { reference: string },
  ) {
    return this.teacherService.verifyColorSchemePayment(userId, body.reference);
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
    // Remove description to let the system use the notification message from details.message
    details: (args, result) => {
      // Extract the DTO from the request body
      const request = args[0];
      const dto = request.body as MarkClassAttendanceDto;

      // Get class name from result, fallback to a generic message if not available
      const classArmName = result?.data?.classArmName;
      const message = classArmName
        ? `Class attendance marked for class ${classArmName}`
        : 'Class attendance marked';

      return {
        message: message,
        classArmId: dto.classArmId,
        classArmName: classArmName || 'Unknown',
        date: dto.date,
        studentCount: dto.studentAttendances?.length || 0,
        presentCount: result?.presentCount || 0,
        absentCount: result?.absentCount || 0,
        lateCount: result?.lateCount || 0,
        excusedCount: result?.excusedCount || 0,
        // Add a flag to indicate this message should not include user name
        skipUserName: true,
      };
    },
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
    description: (args) => {
      const dto = args[1] as MarkSubjectAttendanceDto;
      return `Subject attendance marked for class ${dto.classArmId}`;
    },
    details: (args) => {
      const dto = args[1] as MarkSubjectAttendanceDto;
      return {
        subjectId: dto.subjectId,
        classArmId: dto.classArmId,
        date: dto.date,
        studentCount: dto.studentAttendances.length,
      };
    },
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
