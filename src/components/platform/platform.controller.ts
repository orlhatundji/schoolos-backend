import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PlatformService } from './platform.service';
import { SchoolsManagementService } from './services/schools-management.service';
import { SignupApprovalService } from './services/signup-approval.service';
import { ComplaintsService } from './services/complaints.service';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards/access-token.guard';
import { UserType } from '@prisma/client';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { ApproveSignupDto } from './dto/approve-signup.dto';
import { RejectSignupDto } from './dto/reject-signup.dto';
import { AssignComplaintDto } from './dto/assign-complaint.dto';
import { AddComplaintCommentDto } from './dto/add-complaint-comment.dto';

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
  updateSchoolStatus(
    @Param('id') id: string,
    @Body() body: { status: string; reason?: string },
  ) {
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
  approveSignupRequest(
    @Param('id') id: string,
    @Body() approveSignupDto: ApproveSignupDto,
  ) {
    return this.signupApprovalService.approveSignupRequest(id, approveSignupDto);
  }

  @Post('signup-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Signup request rejected' })
  rejectSignupRequest(
    @Param('id') id: string,
    @Body() rejectSignupDto: RejectSignupDto,
  ) {
    return this.signupApprovalService.rejectSignupRequest(id, rejectSignupDto);
  }

  // Complaints Management
  @Get('complaints')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of complaints' })
  getComplaints(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
  ) {
    return this.complaintsService.getComplaints({ page, limit, status, priority, category });
  }

  @Get('complaints/:id')
  @ApiResponse({ status: HttpStatus.OK, description: 'Complaint details' })
  getComplaint(@Param('id') id: string) {
    return this.complaintsService.getComplaint(id);
  }

  @Post('complaints')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Complaint created' })
  createComplaint(@Body() createComplaintDto: CreateComplaintDto) {
    return this.complaintsService.createComplaint(createComplaintDto);
  }

  @Patch('complaints/:id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Complaint updated' })
  updateComplaint(
    @Param('id') id: string,
    @Body() updateComplaintDto: UpdateComplaintDto,
  ) {
    return this.complaintsService.updateComplaint(id, updateComplaintDto);
  }

  @Post('complaints/:id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Complaint assigned' })
  assignComplaint(
    @Param('id') id: string,
    @Body() assignComplaintDto: AssignComplaintDto,
  ) {
    return this.complaintsService.assignComplaint(id, assignComplaintDto);
  }

  @Post('complaints/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Comment added' })
  addComplaintComment(
    @Param('id') id: string,
    @Body() addCommentDto: AddComplaintCommentDto,
  ) {
    return this.complaintsService.addComment(id, addCommentDto);
  }

  @Get('complaints/:id/comments')
  @ApiResponse({ status: HttpStatus.OK, description: 'Complaint comments' })
  getComplaintComments(@Param('id') id: string) {
    return this.complaintsService.getComments(id);
  }
}
