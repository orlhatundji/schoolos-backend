import { Controller, Post, Body, HttpStatus, Get, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SchoolSignupService } from './school-signup.service';
import { CreateSchoolSignupDto, UpdateSchoolSignupStatusDto, GetSchoolSignupRequestsDto } from './dto';
import {
  SchoolSignupResult,
  SchoolSignupApprovalResult,
  ManySchoolSignupResult,
  SchoolSignupMessages,
} from './results';
import { Public } from '../../../common/decorators';
import { GetCurrentUserId } from '../../../common/decorators';
import { StrategyEnum } from '../../auth/strategies';
import { SchoolSignupStatus } from '@prisma/client';

@Controller('school-signup')
@ApiTags('School Signup')
export class SchoolSignupController {
  constructor(private readonly schoolSignupService: SchoolSignupService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Submit a school signup request' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: SchoolSignupResult,
    description: SchoolSignupMessages.SUCCESS.SIGNUP_REQUEST_CREATED,
  })
  async createSignupRequest(@Body() createSchoolSignupDto: CreateSchoolSignupDto) {
    const signupRequest = await this.schoolSignupService.createSignupRequest(createSchoolSignupDto);

    return SchoolSignupResult.from(signupRequest, {
      status: HttpStatus.CREATED,
      message: SchoolSignupMessages.SUCCESS.SIGNUP_REQUEST_CREATED,
    });
  }

  @Get('requests')
  @ApiBearerAuth(StrategyEnum.JWT)
  @ApiOperation({ summary: 'Get all school signup requests with optional filtering' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: SchoolSignupStatus,
    description: 'Filter by signup request status',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to return',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ManySchoolSignupResult,
    description: 'School signup requests retrieved successfully',
  })
  async getAllSignupRequests(@Query() filters: GetSchoolSignupRequestsDto) {
    const signupRequests = await this.schoolSignupService.getAllSignupRequests(filters);

    return ManySchoolSignupResult.from(signupRequests, {
      status: HttpStatus.OK,
      message: SchoolSignupMessages.SUCCESS.SIGNUP_REQUEST_RETRIEVED,
    });
  }

  @Get('requests/:requestId')
  @ApiBearerAuth(StrategyEnum.JWT)
  @ApiOperation({ summary: 'Get a specific school signup request' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SchoolSignupResult,
    description: SchoolSignupMessages.SUCCESS.SIGNUP_REQUEST_RETRIEVED,
  })
  async getSignupRequest(@Param('requestId') requestId: string) {
    const signupRequest = await this.schoolSignupService.getSignupRequest(requestId);

    return SchoolSignupResult.from(signupRequest, {
      status: HttpStatus.OK,
      message: SchoolSignupMessages.SUCCESS.SIGNUP_REQUEST_RETRIEVED,
    });
  }

  @Post('requests/:requestId/update')
  @ApiBearerAuth(StrategyEnum.JWT)
  @ApiOperation({ summary: 'Approve or reject a school signup request' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SchoolSignupApprovalResult,
    description: 'School signup request updated successfully',
  })
  async updateSignupStatus(
    @Param('requestId') requestId: string,
    @Body() updateDto: UpdateSchoolSignupStatusDto,
    @GetCurrentUserId() reviewerId: string,
  ) {
    const result = await this.schoolSignupService.updateSignupStatus(
      requestId,
      updateDto,
      reviewerId,
    );

    return SchoolSignupApprovalResult.from(result, {
      status: HttpStatus.OK,
      message: result.message,
    });
  }
}
