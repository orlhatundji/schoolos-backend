import { Controller, Get, Query, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { GetCurrentUserId } from '../../../common/decorators';
import { LogActivity } from '../../../common/decorators/log-activity.decorator';
import { ActivityLogInterceptor } from '../../../common/interceptors/activity-log.interceptor';
import { StrategyEnum } from '../../auth/strategies';
import { AccessTokenGuard } from '../../auth/strategies/jwt/guards/access-token.guard';
import { StudentDashboardResult, StudentResultsResult } from './results';
import { StudentService } from './student.service';
import { PdfService } from '../../../shared/services';

@Controller('student')
@ApiTags('Student Portal')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard)
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly pdfService: PdfService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get student dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Student dashboard data retrieved successfully',
    type: StudentDashboardResult,
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_STUDENT_DASHBOARD',
    entityType: 'STUDENT_DASHBOARD',
    description: 'Student viewed dashboard',
    category: 'STUDENT',
  })
  async getStudentDashboard(@GetCurrentUserId() userId: string) {
    const data = await this.studentService.getStudentDashboardData(userId);
    return new StudentDashboardResult(data);
  }

  @Get('results')
  @ApiOperation({ summary: 'Get student academic results' })
  @ApiQuery({
    name: 'academicSessionId',
    required: false,
    type: String,
    description: 'Academic session ID to filter results',
  })
  @ApiQuery({
    name: 'termId',
    required: false,
    type: String,
    description: 'Term ID to filter results',
  })
  @ApiQuery({
    name: 'subjectId',
    required: false,
    type: String,
    description: 'Subject ID to filter results',
  })
  @ApiResponse({
    status: 200,
    description: 'Student results retrieved successfully',
    type: StudentResultsResult,
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_STUDENT_RESULTS',
    entityType: 'STUDENT_RESULTS',
    description: 'Student viewed academic results',
    category: 'STUDENT',
  })
  async getStudentResults(
    @GetCurrentUserId() userId: string,
    @Query('academicSessionId') academicSessionId?: string,
    @Query('termId') termId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    const results = await this.studentService.getStudentResults(
      userId,
      academicSessionId,
      termId,
      subjectId,
    );
    return new StudentResultsResult(results);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get student profile information' })
  @ApiResponse({
    status: 200,
    description: 'Student profile retrieved successfully',
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_STUDENT_PROFILE',
    entityType: 'STUDENT_PROFILE',
    description: 'Student viewed profile',
    category: 'STUDENT',
  })
  async getStudentProfile(@GetCurrentUserId() userId: string) {
    const profile = await this.studentService.getStudentProfile(userId);
    return {
      success: true,
      message: 'Student profile retrieved successfully',
      data: profile,
    };
  }

  @Get('attendance')
  @ApiOperation({ summary: 'Get student attendance records' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for attendance records (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for attendance records (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Student attendance records retrieved successfully',
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_STUDENT_ATTENDANCE',
    entityType: 'STUDENT_ATTENDANCE',
    description: 'Student viewed attendance records',
    category: 'STUDENT',
  })
  async getStudentAttendance(
    @GetCurrentUserId() userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const attendance = await this.studentService.getStudentAttendance(userId, startDate, endDate);
    return {
      success: true,
      message: 'Student attendance records retrieved successfully',
      data: attendance,
    };
  }

  @Get('subjects')
  @ApiOperation({ summary: 'Get student enrolled subjects' })
  @ApiQuery({
    name: 'academicSessionId',
    required: false,
    type: String,
    description: 'Academic session ID to filter subjects',
  })
  @ApiQuery({
    name: 'termId',
    required: false,
    type: String,
    description: 'Term ID to filter subjects',
  })
  @ApiResponse({
    status: 200,
    description: 'Student subjects retrieved successfully',
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_STUDENT_SUBJECTS',
    entityType: 'STUDENT_SUBJECTS',
    description: 'Student viewed enrolled subjects',
    category: 'STUDENT',
  })
  async getStudentSubjects(
    @GetCurrentUserId() userId: string,
    @Query('academicSessionId') academicSessionId?: string,
    @Query('termId') termId?: string,
  ) {
    const subjects = await this.studentService.getStudentSubjects(
      userId,
      academicSessionId,
      termId,
    );
    return {
      success: true,
      message: 'Student subjects retrieved successfully',
      data: subjects,
    };
  }

  @Get('results/pdf')
  @ApiOperation({ summary: 'Download student results as PDF' })
  @ApiQuery({
    name: 'academicSessionId',
    required: false,
    type: String,
    description: 'Academic session ID to filter results',
  })
  @ApiQuery({
    name: 'termId',
    required: false,
    type: String,
    description: 'Term ID to filter results',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF file download',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'DOWNLOAD_STUDENT_RESULTS_PDF',
    entityType: 'STUDENT_RESULTS_PDF',
    description: 'Student downloaded results as PDF',
    category: 'STUDENT',
  })
  async downloadResultsPDF(
    @GetCurrentUserId() userId: string,
    @Res() res: Response,
    @Query('academicSessionId') academicSessionId?: string,
    @Query('termId') termId?: string,
  ) {
    try {
      // Get student results data
      const resultsData = await this.studentService.getStudentResults(
        userId,
        academicSessionId,
        termId,
      );

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateStudentResultPDF(resultsData);

      // Set response headers for PDF download
      const filename = `results_${resultsData.student.studentNo}_${resultsData.term.name.replace(/\s+/g, '_')}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      // Send PDF buffer
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate PDF',
        error: error.message,
      });
    }
  }
}
