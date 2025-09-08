import { Controller, Get, UseGuards, UseInterceptors, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../../common/decorators';
import { ActivityLogInterceptor } from '../../../common/interceptors/activity-log.interceptor';
import { LogActivity } from '../../../common/decorators/log-activity.decorator';
import { AccessTokenGuard } from '../../auth/strategies/jwt/guards/access-token.guard';
import { StrategyEnum } from '../../auth/strategies';
import { TeacherService } from './teacher.service';
import {
  TeacherDashboardResult,
  TeacherClassesResult,
  TeacherSubjectsResult,
  TeacherActivitiesResult,
  TeacherEventsResult,
  TeacherProfileResult,
} from './results';
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
}
