import { Body, Controller, Get, Param, Post, Put, Query, Res, UseGuards, UseInterceptors } from '@nestjs/common';
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
import { 
  InitiatePaymentDto, 
  PaymentVerificationDto, 
  PaystackPaymentResponseDto,
  StudentPaymentResponseDto,
  StudentPaymentSummaryDto,
  StudentPaymentHistoryDto
} from './dto/student-payment.dto';

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
    description:
      'Academic session ID to filter results. If not provided, uses current session or most recent session',
  })
  @ApiQuery({
    name: 'termId',
    required: false,
    type: String,
    description:
      'Term ID to filter results. If not provided, uses current term or most recent term within the selected session',
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

  @Put('change-password')
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'CHANGE_PASSWORD',
    entityType: 'STUDENT_PROFILE',
    description: 'Student changed password',
    category: 'STUDENT',
  })
  @ApiOperation({ summary: 'Change student password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Invalid current password' })
  async changePassword(
    @GetCurrentUserId() userId: string,
    @Body() passwordData: { oldPassword: string; newPassword: string },
  ) {
    await this.studentService.changePassword(
      userId,
      passwordData.oldPassword,
      passwordData.newPassword,
    );
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  @Get('academic-sessions')
  @ApiOperation({
    summary: 'Get academic sessions with associated terms where student was enrolled',
  })
  @ApiResponse({
    status: 200,
    description: 'Student academic sessions with terms retrieved successfully',
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_STUDENT_ACADEMIC_SESSIONS',
    entityType: 'STUDENT_ACADEMIC_SESSIONS',
    description: 'Student viewed enrolled academic sessions with terms',
    category: 'STUDENT',
  })
  async getStudentAcademicSessions(@GetCurrentUserId() userId: string) {
    const sessions = await this.studentService.getStudentAcademicSessions(userId);
    return {
      success: true,
      message: 'Student academic sessions with terms retrieved successfully',
      data: sessions,
    };
  }

  @Get('results/pdf')
  @ApiOperation({ summary: 'Download student results as PDF' })
  @ApiQuery({
    name: 'academicSessionId',
    required: false,
    type: String,
    description:
      'Academic session ID to filter results. If not provided, uses current session or most recent session',
  })
  @ApiQuery({
    name: 'termId',
    required: false,
    type: String,
    description:
      'Term ID to filter results. If not provided, uses current term or most recent term within the selected session',
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

      // Generate PDF with school's selected template
      const templateId = resultsData.school.resultTemplateId || 'classic';
      const pdfBuffer = await this.pdfService.generateStudentResultPDF(resultsData, templateId);

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

  // Payment endpoints
  @Get('payments')
  @ApiOperation({ summary: 'Get student payments' })
  @ApiResponse({
    status: 200,
    description: 'Student payments retrieved successfully',
    type: [StudentPaymentResponseDto],
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_STUDENT_PAYMENTS',
    entityType: 'STUDENT_PAYMENTS',
    description: 'Student viewed payments',
    category: 'STUDENT',
  })
  async getStudentPayments(@GetCurrentUserId() userId: string) {
    const payments = await this.studentService.getStudentPayments(userId);
    return {
      success: true,
      message: 'Student payments retrieved successfully',
      data: payments,
    };
  }

  @Get('payments/summary')
  @ApiOperation({ summary: 'Get student payment summary' })
  @ApiResponse({
    status: 200,
    description: 'Student payment summary retrieved successfully',
    type: StudentPaymentSummaryDto,
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_STUDENT_PAYMENT_SUMMARY',
    entityType: 'STUDENT_PAYMENT_SUMMARY',
    description: 'Student viewed payment summary',
    category: 'STUDENT',
  })
  async getStudentPaymentSummary(@GetCurrentUserId() userId: string) {
    const summary = await this.studentService.getStudentPaymentSummary(userId);
    return {
      success: true,
      message: 'Student payment summary retrieved successfully',
      data: summary,
    };
  }

  @Get('payments/outstanding')
  @ApiOperation({ summary: 'Get student outstanding payments' })
  @ApiResponse({
    status: 200,
    description: 'Student outstanding payments retrieved successfully',
    type: [StudentPaymentResponseDto],
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_STUDENT_OUTSTANDING_PAYMENTS',
    entityType: 'STUDENT_OUTSTANDING_PAYMENTS',
    description: 'Student viewed outstanding payments',
    category: 'STUDENT',
  })
  async getOutstandingPayments(@GetCurrentUserId() userId: string) {
    const payments = await this.studentService.getOutstandingPayments(userId);
    return {
      success: true,
      message: 'Student outstanding payments retrieved successfully',
      data: payments,
    };
  }

  @Get('payments/history')
  @ApiOperation({ summary: 'Get student payment history' })
  @ApiResponse({
    status: 200,
    description: 'Student payment history retrieved successfully',
    type: [StudentPaymentHistoryDto],
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VIEW_STUDENT_PAYMENT_HISTORY',
    entityType: 'STUDENT_PAYMENT_HISTORY',
    description: 'Student viewed payment history',
    category: 'STUDENT',
  })
  async getStudentPaymentHistory(@GetCurrentUserId() userId: string) {
    const history = await this.studentService.getStudentPaymentHistory(userId);
    return {
      success: true,
      message: 'Student payment history retrieved successfully',
      data: history,
    };
  }

  @Post('payments/initiate')
  @ApiOperation({ summary: 'Initiate payment for a student payment' })
  @ApiResponse({
    status: 200,
    description: 'Payment initiated successfully',
    type: PaystackPaymentResponseDto,
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'INITIATE_STUDENT_PAYMENT',
    entityType: 'STUDENT_PAYMENT',
    description: 'Student initiated payment',
    category: 'STUDENT',
  })
  async initiatePayment(
    @GetCurrentUserId() userId: string,
    @Body() initiatePaymentDto: InitiatePaymentDto,
  ) {
    const paymentData = await this.studentService.initiatePayment(
      userId,
      initiatePaymentDto.paymentId,
      initiatePaymentDto.amount,
    );

    return {
      success: true,
      message: 'Payment initiated successfully',
      data: paymentData,
    };
  }

  @Post('payments/verify')
  @ApiOperation({ summary: 'Verify payment transaction' })
  @ApiResponse({
    status: 200,
    description: 'Payment verification completed',
  })
  @UseInterceptors(ActivityLogInterceptor)
  @LogActivity({
    action: 'VERIFY_STUDENT_PAYMENT',
    entityType: 'STUDENT_PAYMENT',
    description: 'Student verified payment',
    category: 'STUDENT',
  })
  async verifyPayment(
    @GetCurrentUserId() userId: string,
    @Body() verificationDto: PaymentVerificationDto,
  ) {
    const result = await this.studentService.verifyPayment(userId, verificationDto.reference);
    
    return {
      success: result.success,
      message: result.message,
      data: result.payment,
    };
  }
}
