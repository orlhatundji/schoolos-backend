import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SchoolSignupStatus } from '@prisma/client';
import { ApproveSignupDto } from '../dto/approve-signup.dto';
import { RejectSignupDto } from '../dto/reject-signup.dto';

@Injectable()
export class SignupApprovalService {
  constructor(private readonly prisma: PrismaService) {}

  async getSignupRequests(params: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const { page = 1, limit = 10, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status as SchoolSignupStatus;
    }

    const [requests, total] = await Promise.all([
      this.prisma.schoolSignupRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.schoolSignupRequest.count({ where }),
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getSignupRequest(id: string) {
    const request = await this.prisma.schoolSignupRequest.findUnique({
      where: { id },
      include: {
        reviewer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Signup request not found');
    }

    return request;
  }

  async approveSignupRequest(id: string, approveSignupDto: ApproveSignupDto) {
    const request = await this.prisma.schoolSignupRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Signup request not found');
    }

    if (request.status !== SchoolSignupStatus.PENDING) {
      throw new BadRequestException('Request has already been processed');
    }

    // Update the request status
    const updatedRequest = await this.prisma.schoolSignupRequest.update({
      where: { id },
      data: {
        status: SchoolSignupStatus.APPROVED,
        reviewedAt: new Date(),
        notes: approveSignupDto.notes,
        // Note: reviewerId should be set from the authenticated user context
      },
    });

    // Here you would typically create the school and admin user
    // This is a simplified version - in reality, you'd need to:
    // 1. Create the school
    // 2. Create the admin user
    // 3. Send welcome email
    // 4. Set up initial configuration

    return updatedRequest;
  }

  async rejectSignupRequest(id: string, rejectSignupDto: RejectSignupDto) {
    const request = await this.prisma.schoolSignupRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Signup request not found');
    }

    if (request.status !== SchoolSignupStatus.PENDING) {
      throw new BadRequestException('Request has already been processed');
    }

    return this.prisma.schoolSignupRequest.update({
      where: { id },
      data: {
        status: SchoolSignupStatus.REJECTED,
        reviewedAt: new Date(),
        rejectionReason: rejectSignupDto.rejectionReason,
        // Note: reviewerId should be set from the authenticated user context
      },
    });
  }
}
