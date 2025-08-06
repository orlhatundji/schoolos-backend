import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SchoolSignupRepository } from './school-signup.repository';
import { CreateSchoolSignupDto, UpdateSchoolSignupStatusDto, GetSchoolSignupRequestsDto } from './dto';
import { SchoolSignupRequestWithReviewer } from './types/school-signup';
import { SchoolsService } from '../schools.service';
import { SchoolSignupMessages } from './results/messages';
import { SchoolSignupRequest, SchoolSignupStatus } from '@prisma/client';

@Injectable()
export class SchoolSignupService {
  constructor(
    private readonly schoolSignupRepository: SchoolSignupRepository,
    private readonly schoolsService: SchoolsService,
  ) {}

  async createSignupRequest(
    createSchoolSignupDto: CreateSchoolSignupDto,
  ): Promise<SchoolSignupRequest> {
    // Check if school code already exists
    const existingRequest = await this.schoolSignupRepository.findOneBySchoolCode(
      createSchoolSignupDto.schoolCode,
    );
    if (existingRequest) {
      throw new BadRequestException(SchoolSignupMessages.FAILURE.SCHOOL_CODE_EXISTS);
    }

    // Check if school already exists
    try {
      await this.schoolsService.getSchoolByCode(createSchoolSignupDto.schoolCode);
      throw new BadRequestException(SchoolSignupMessages.FAILURE.SCHOOL_CODE_EXISTS);
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }

    const signupRequest = await this.schoolSignupRepository.create({
      schoolName: createSchoolSignupDto.schoolName,
      schoolCode: createSchoolSignupDto.schoolCode,
      contactPerson: createSchoolSignupDto.contactPerson as any,
      address: createSchoolSignupDto.address as any,
      schoolDetails: createSchoolSignupDto.schoolDetails as any,
      status: SchoolSignupStatus.PENDING,
      submittedAt: new Date(),
    });

    return signupRequest;
  }

  async getSignupRequest(id: string): Promise<SchoolSignupRequest> {
    const signupRequest = await this.schoolSignupRepository.findById(id);
    if (!signupRequest) {
      throw new NotFoundException(SchoolSignupMessages.FAILURE.SIGNUP_REQUEST_NOT_FOUND);
    }
    return signupRequest;
  }

  async getAllSignupRequests(filters?: GetSchoolSignupRequestsDto): Promise<SchoolSignupRequestWithReviewer[]> {
    const where: any = {};
    
    // Apply status filter if provided
    if (filters?.status) {
      where.status = filters.status;
    }

    return this.schoolSignupRepository.findAllWithReviewer({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || undefined,
    });
  }

  async updateSignupStatus(
    id: string,
    updateDto: UpdateSchoolSignupStatusDto,
    reviewerId: string,
  ): Promise<{
    requestId: string;
    status: string;
    message: string;
    reviewedAt: Date;
  }> {
    const signupRequest = await this.getSignupRequest(id);

    if (updateDto.action === 'approve') {
      return this.approveSignupRequest(signupRequest, updateDto.notes, reviewerId);
    }

    if (updateDto.action === 'reject') {
      return this.rejectSignupRequest(
        signupRequest,
        updateDto.rejectionReason,
        updateDto.notes,
        reviewerId,
      );
    }

    throw new BadRequestException(SchoolSignupMessages.FAILURE.INVALID_ACTION);
  }

  private async approveSignupRequest(
    signupRequest: SchoolSignupRequest,
    notes: string,
    reviewerId: string,
  ) {
    const req = await this.schoolSignupRepository.update(
      { id: signupRequest.id },
      {
        status: SchoolSignupStatus.APPROVED,
        reviewedAt: new Date(),
        reviewer: {
          connect: { id: reviewerId },
        },
        notes,
      },
    );

    return {
      requestId: signupRequest.id,
      status: 'APPROVED',
      message: SchoolSignupMessages.SUCCESS.SIGNUP_REQUEST_APPROVED,
      reviewedAt: req.reviewedAt,
    };
  }

  private async rejectSignupRequest(
    signupRequest: SchoolSignupRequest,
    rejectionReason: string,
    notes: string,
    reviewerId: string,
  ) {
    const req = await this.schoolSignupRepository.update(
      { id: signupRequest.id },
      {
        status: SchoolSignupStatus.REJECTED,
        reviewedAt: new Date(),
        reviewer: {
          connect: { id: reviewerId },
        },
        notes,
        rejectionReason,
      },
    );

    return {
      requestId: signupRequest.id,
      status: 'REJECTED',
      message: SchoolSignupMessages.SUCCESS.SIGNUP_REQUEST_REJECTED,
      reviewedAt: req.reviewedAt,
    };
  }
}
