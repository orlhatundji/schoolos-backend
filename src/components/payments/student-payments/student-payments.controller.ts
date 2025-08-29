import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../../common/decorators/get-current-user-id.decorator';
import { AccessTokenGuard } from '../../auth/strategies/jwt/guards/access-token.guard';
import { CheckPolicies } from '../../roles-manager/policies/check-policies.decorator';
import { PoliciesGuard } from '../../roles-manager/policies/policies.guard';
import { UpdateStudentPaymentDto } from './dto/update-student-payment.dto';
import { StudentPaymentsService } from './student-payments.service';

@ApiTags('Student Payments')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, PoliciesGuard)
@Controller('student-payments')
export class StudentPaymentsController {
  constructor(private readonly studentPaymentsService: StudentPaymentsService) {}

  @Get()
  @CheckPolicies()
  @ApiOperation({ summary: 'Get all student payments for the school' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by payment status' })
  @ApiQuery({ name: 'studentId', required: false, description: 'Filter by student ID' })
  @ApiQuery({
    name: 'paymentStructureId',
    required: false,
    description: 'Filter by payment structure ID',
  })
  @ApiQuery({
    name: 'dueDateFrom',
    required: false,
    description: 'Filter by due date from (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'dueDateTo',
    required: false,
    description: 'Filter by due date to (YYYY-MM-DD)',
  })
  @ApiResponse({ status: 200, description: 'Student payments retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll(@GetCurrentUserId() userId: string, @Query() filters: any) {
    return this.studentPaymentsService.getAllStudentPayments(userId, filters);
  }

  @Get('statistics')
  @CheckPolicies()
  @ApiOperation({ summary: 'Get payment statistics for the school' })
  @ApiResponse({ status: 200, description: 'Payment statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getStatistics(@GetCurrentUserId() userId: string) {
    return this.studentPaymentsService.getPaymentStatistics(userId);
  }

  @Get(':id')
  @CheckPolicies()
  @ApiOperation({ summary: 'Get a specific student payment by ID' })
  @ApiResponse({ status: 200, description: 'Student payment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Student payment not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findOne(@GetCurrentUserId() userId: string, @Param('id') id: string) {
    return this.studentPaymentsService.getStudentPaymentById(userId, id);
  }

  @Get('student/:studentId')
  @CheckPolicies()
  @ApiOperation({ summary: 'Get all payments for a specific student' })
  @ApiResponse({ status: 200, description: 'Student payments retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findByStudent(@GetCurrentUserId() userId: string, @Param('studentId') studentId: string) {
    return this.studentPaymentsService.getStudentPaymentsByStudent(userId, studentId);
  }

  @Patch(':id')
  @CheckPolicies()
  @ApiOperation({ summary: 'Update a student payment' })
  @ApiResponse({ status: 200, description: 'Student payment updated successfully' })
  @ApiResponse({ status: 404, description: 'Student payment not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() updateStudentPaymentDto: UpdateStudentPaymentDto,
  ) {
    return this.studentPaymentsService.updateStudentPayment(userId, id, updateStudentPaymentDto);
  }

  @Post(':id/mark-paid')
  @CheckPolicies()
  @ApiOperation({ summary: 'Mark a student payment as paid' })
  @ApiResponse({ status: 200, description: 'Payment marked as paid successfully' })
  @ApiResponse({ status: 404, description: 'Student payment not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  markAsPaid(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() body: { paidAmount: number; paidAt?: string },
  ) {
    return this.studentPaymentsService.markPaymentAsPaid(userId, id, body.paidAmount, body.paidAt);
  }

  @Post(':id/waive')
  @CheckPolicies()
  @ApiOperation({ summary: 'Waive a student payment' })
  @ApiResponse({ status: 200, description: 'Payment waived successfully' })
  @ApiResponse({ status: 404, description: 'Student payment not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  waivePayment(
    @GetCurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() body: { waiverReason: string },
  ) {
    return this.studentPaymentsService.waivePayment(userId, id, body.waiverReason);
  }
}
