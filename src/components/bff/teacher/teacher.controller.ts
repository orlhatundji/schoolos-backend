import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../../common/decorators';
import { LogActivity } from '../../../common/decorators/log-activity.decorator';
import { ActivityLogInterceptor } from '../../../common/interceptors/activity-log.interceptor';
import { StrategyEnum } from '../../auth/strategies';
import { AccessTokenGuard } from '../../auth/strategies/jwt/guards/access-token.guard';
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
} from './results';
import { TeacherService } from './teacher.service';
import { CreateStudentAssessmentScoreDto, UpdateStudentAssessmentScoreDto } from './dto';
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
}
