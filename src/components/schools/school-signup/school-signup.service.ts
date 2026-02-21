import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { SchoolSignupRepository } from './school-signup.repository';
import {
  CreateSchoolSignupDto,
  UpdateSchoolSignupStatusDto,
  GetSchoolSignupRequestsDto,
} from './dto';
import { SchoolSignupRequestWithReviewer } from './types/school-signup';
import { SchoolsService } from '../schools.service';
import { SchoolSignupMessages } from './results/messages';
import { MailQueueService } from '../../../utils/mail-queue/mail-queue.service';
import { Prisma, SchoolSignupRequest, SchoolSignupStatus } from '@prisma/client';
import { CounterService } from '../../../common/counter';
import { generateSchoolCode, generateSchoolAcronym } from '../../../utils/misc';

@Injectable()
export class SchoolSignupService {
  private readonly logger = new Logger(SchoolSignupService.name);

  constructor(
    private readonly schoolSignupRepository: SchoolSignupRepository,
    private readonly schoolsService: SchoolsService,
    private readonly counterService: CounterService,
    private readonly mailQueueService: MailQueueService,
  ) {}

  async createSignupRequest(
    createSchoolSignupDto: CreateSchoolSignupDto,
  ): Promise<SchoolSignupRequest> {
    // Generate unique school code using acronym + sequence number
    const schoolCode = await this.generateUniqueSchoolCode(createSchoolSignupDto.schoolName);

    const signupRequest = await this.schoolSignupRepository.create({
      schoolName: createSchoolSignupDto.schoolName,
      schoolCode,
      contactPerson: { ...createSchoolSignupDto.contactPerson },
      address: { ...createSchoolSignupDto.address },
      schoolDetails: { ...createSchoolSignupDto.schoolDetails },
      status: SchoolSignupStatus.PENDING,
      submittedAt: new Date(),
    });

    // Send acknowledgement email to contact person (non-blocking)
    const { contactPerson, schoolName } = createSchoolSignupDto;
    try {
      await this.mailQueueService.add({
        recipientAddress: contactPerson.email,
        recipientName: `${contactPerson.firstName} ${contactPerson.lastName}`,
        subject: `Signup Request Received - ${schoolName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">We've Received Your Signup Request!</h2>
            <p>Hi ${contactPerson.firstName},</p>
            <p>Thank you for registering <strong>${schoolName}</strong> with SchoolOS. Your signup request has been received and is currently under review.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>School Name:</strong> ${schoolName}</p>
              <p style="margin: 5px 0;"><strong>Reference Code:</strong> ${schoolCode}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> Pending Review</p>
            </div>
            <p>Our team will review your request and get back to you shortly. You will receive another email once your request has been processed.</p>
            <p>If you have any questions in the meantime, please don't hesitate to reach out.</p>
            <p>Best regards,<br/>The SchoolOS Team</p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to queue acknowledgement email for signup ${signupRequest.id}:`, error);
    }

    return signupRequest;
  }

  /**
   * Generates a unique school code by combining school name acronym with a prefix-specific sequence number.
   * Each prefix (e.g., BFH, BFA) has its own sequence counter.
   * Format: {PREFIX}{4-DIGIT-SEQ} (e.g., BFH0001, BFA0001, BFH0002)
   */
  private async generateUniqueSchoolCode(schoolName: string): Promise<string> {
    const prefix = generateSchoolAcronym(schoolName);

    // Use prefix-specific counter (e.g., "school_prefix_BFH", "school_prefix_BFA")
    const counterEntity = `school_prefix_${prefix}`;
    const sequenceNo = await this.counterService.getNextGlobalSequenceNo(counterEntity);

    const schoolCode = generateSchoolCode(schoolName, sequenceNo);

    // Verify uniqueness (edge case: if somehow a collision occurs)
    const existingRequest = await this.schoolSignupRepository.findOneBySchoolCode(schoolCode);
    if (existingRequest) {
      // Retry with next sequence number
      const retrySequenceNo = await this.counterService.getNextGlobalSequenceNo(counterEntity);
      return generateSchoolCode(schoolName, retrySequenceNo);
    }

    try {
      await this.schoolsService.getSchoolByCode(schoolCode);
      // School exists - retry with next sequence number
      const retrySequenceNo = await this.counterService.getNextGlobalSequenceNo(counterEntity);
      return generateSchoolCode(schoolName, retrySequenceNo);
    } catch (error) {
      if (error instanceof NotFoundException) {
        // School doesn't exist - this code is available
        return schoolCode;
      }
      throw error;
    }
  }

  async getSignupRequest(id: string): Promise<SchoolSignupRequest> {
    const signupRequest = await this.schoolSignupRepository.findById(id);
    if (!signupRequest) {
      throw new NotFoundException(SchoolSignupMessages.FAILURE.SIGNUP_REQUEST_NOT_FOUND);
    }
    return signupRequest;
  }

  async getAllSignupRequests(
    filters?: GetSchoolSignupRequestsDto,
  ): Promise<SchoolSignupRequestWithReviewer[]> {
    const where: Prisma.SchoolSignupRequestWhereInput = {};

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
