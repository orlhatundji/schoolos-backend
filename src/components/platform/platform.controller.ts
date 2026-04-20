import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../common/decorators';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards/access-token.guard';
import { AddComplaintCommentDto } from './dto/add-complaint-comment.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { ApproveSignupDto } from './dto/approve-signup.dto';
import { AssignComplaintDto } from './dto/assign-complaint.dto';
import { ComplaintsQueryDto } from './dto/complaints-query.dto';
import { RejectSignupDto } from './dto/reject-signup.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { PlatformService } from './platform.service';
import { AnalyticsService } from './services/analytics.service';
import { ComplaintsService } from './services/complaints.service';
import { ReportsService } from './services/reports.service';
import { SchoolsManagementService } from './services/schools-management.service';
import { SignupApprovalService } from './services/signup-approval.service';

@Controller('platform')
@ApiTags('Platform Management')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
export class PlatformController {
  constructor(
    private readonly platformService: PlatformService,
    private readonly schoolsManagementService: SchoolsManagementService,
    private readonly signupApprovalService: SignupApprovalService,
    private readonly complaintsService: ComplaintsService,
    private readonly analyticsService: AnalyticsService,
    private readonly reportsService: ReportsService,
  ) {}

  // Dashboard
  @Get('dashboard')
  @ApiResponse({ status: HttpStatus.OK, description: 'Platform dashboard data' })
  getDashboard() {
    return this.platformService.getDashboard();
  }

  // Schools Management
  @Get('schools')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of schools' })
  getSchools(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.schoolsManagementService.getSchools({ page, limit, search, status });
  }

  @Get('schools/:id')
  @ApiResponse({ status: HttpStatus.OK, description: 'School details' })
  getSchool(@Param('id') id: string) {
    return this.schoolsManagementService.getSchool(id);
  }

  @Patch('schools/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'School status updated' })
  updateSchoolStatus(@Param('id') id: string, @Body() body: { status: string; reason?: string }) {
    return this.schoolsManagementService.updateSchoolStatus(id, body.status, body.reason);
  }

  // Signup Approval
  @Get('signup-requests')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of signup requests' })
  getSignupRequests(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.signupApprovalService.getSignupRequests({ page, limit, status });
  }

  @Get('signup-requests/:id')
  @ApiResponse({ status: HttpStatus.OK, description: 'Signup request details' })
  getSignupRequest(@Param('id') id: string) {
    return this.signupApprovalService.getSignupRequest(id);
  }

  @Post('signup-requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Signup request approved' })
  approveSignupRequest(@Param('id') id: string, @Body() approveSignupDto: ApproveSignupDto) {
    return this.signupApprovalService.approveSignupRequest(id, approveSignupDto);
  }

  @Post('signup-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Signup request rejected' })
  rejectSignupRequest(@Param('id') id: string, @Body() rejectSignupDto: RejectSignupDto) {
    return this.signupApprovalService.rejectSignupRequest(id, rejectSignupDto);
  }

  // ─── Complaints ────────────────────────────────────────────────────────────

  @Get('complaints')
  @ApiResponse({ status: HttpStatus.OK, description: 'List of complaints' })
  listComplaints(@Query() query: ComplaintsQueryDto) {
    return this.complaintsService.list(query);
  }

  @Get('complaints/:id')
  @ApiResponse({ status: HttpStatus.OK, description: 'Complaint detail' })
  getComplaint(@Param('id') id: string) {
    return this.complaintsService.getOne(id);
  }

  @Patch('complaints/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Complaint status updated' })
  updateComplaintStatus(
    @Param('id') id: string,
    @Body() dto: UpdateComplaintStatusDto,
    @GetCurrentUserId() userId: string,
  ) {
    return this.complaintsService.updateStatus(id, dto, userId);
  }

  @Patch('complaints/:id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Complaint assigned' })
  assignComplaint(@Param('id') id: string, @Body() dto: AssignComplaintDto) {
    return this.complaintsService.assign(id, dto);
  }

  @Patch('complaints/:id/pick-up')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Complaint picked up by current admin' })
  pickUpComplaint(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.complaintsService.pickUp(id, userId);
  }

  @Patch('complaints/:id/unassign')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Complaint unassigned' })
  unassignComplaint(@Param('id') id: string) {
    return this.complaintsService.unassign(id);
  }

  @Post('complaints/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Comment added' })
  addComplaintComment(
    @Param('id') id: string,
    @Body() dto: AddComplaintCommentDto,
    @GetCurrentUserId() userId: string,
  ) {
    return this.complaintsService.addComment(id, dto, userId);
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  @Get('analytics/overview')
  @ApiResponse({ status: HttpStatus.OK, description: 'Platform analytics overview' })
  getAnalyticsOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('analytics/growth')
  @ApiResponse({ status: HttpStatus.OK, description: 'Growth time series' })
  getAnalyticsGrowth(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getGrowth(query);
  }

  @Get('analytics/revenue')
  @ApiResponse({ status: HttpStatus.OK, description: 'Revenue time series' })
  getAnalyticsRevenue(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getRevenueTrend(query);
  }

  @Get('analytics/top-schools')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Most and least active schools by login recency',
  })
  getAnalyticsTopSchools() {
    return this.analyticsService.getTopSchoolsByActivity();
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  @Get('reports/schools')
  @ApiResponse({ status: HttpStatus.OK, description: 'Per-school rollup report' })
  getSchoolsReport() {
    return this.reportsService.getSchoolsRollup();
  }

  @Get('reports/payments')
  @ApiResponse({ status: HttpStatus.OK, description: 'Platform payments breakdown' })
  getPaymentsReport() {
    return this.reportsService.getPaymentsBreakdown();
  }

  @Get('reports/complaints')
  @ApiResponse({ status: HttpStatus.OK, description: 'Complaints aging report' })
  getComplaintsReport() {
    return this.reportsService.getComplaintsReport();
  }
}
