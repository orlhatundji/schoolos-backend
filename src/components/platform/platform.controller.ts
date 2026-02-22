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

import { AccessTokenGuard } from '../auth/strategies/jwt/guards/access-token.guard';
import { ApproveSignupDto } from './dto/approve-signup.dto';
import { RejectSignupDto } from './dto/reject-signup.dto';
import { PlatformService } from './platform.service';
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
}
