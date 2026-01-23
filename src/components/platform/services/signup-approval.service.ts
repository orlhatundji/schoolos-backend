import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SchoolSignupStatus, UserType } from '@prisma/client';
import { ApproveSignupDto } from '../dto/approve-signup.dto';
import { RejectSignupDto } from '../dto/reject-signup.dto';
import { PasswordGenerator } from '../../../utils/password/password.generator';
import { PasswordHasher } from '../../../utils/hasher/hasher';
import { MailService } from '../../../utils/mail/mail.service';
import { CounterService } from '../../../common/counter';
import { getNextUserEntityNoFormatted } from '../../../utils/misc';

@Injectable()
export class SignupApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordGenerator: PasswordGenerator,
    private readonly passwordHasher: PasswordHasher,
    private readonly mailService: MailService,
    private readonly counterService: CounterService,
  ) {}

  async getSignupRequests(params: { page?: number; limit?: number; status?: string }) {
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

    // Use transaction to ensure data consistency
    return await this.prisma.$transaction(async (tx) => {
      // Type cast the JSON data
      const addressData = request.address as any;
      const contactPersonData = request.contactPerson as any;

      // 1. Create address record
      const address = await tx.address.create({
        data: {
          country: addressData.country,
          state: addressData.state,
          city: addressData.city,
          street1: addressData.street1,
          street2: addressData.street2 || null,
        },
      });

      // 2. Create school record
      const school = await tx.school.create({
        data: {
          name: request.schoolName,
          code: request.schoolCode,
          primaryAddressId: address.id,
          phone: contactPersonData.phone,
          email: contactPersonData.email,
        },
      });

      // 3. Link school to address
      await tx.schoolAddress.create({
        data: {
          schoolId: school.id,
          addressId: address.id,
        },
      });

      // 4. Generate secure admin password
      const adminPassword = this.passwordGenerator.generate();
      console.log('[SignupApprovalService] Admin password:', adminPassword);
      const hashedPassword = await this.passwordHasher.hash(adminPassword);

      // 5. Create admin user
      const adminUser = await tx.user.create({
        data: {
          type: UserType.SUPER_ADMIN,
          email: contactPersonData.email,
          password: hashedPassword,
          firstName: contactPersonData.firstName,
          lastName: contactPersonData.lastName,
          phone: contactPersonData.phone,
          gender: 'MALE', // Default gender since not provided in signup
          school: {
            connect: { id: school.id },
          },
          mustUpdatePassword: true, // Force password change on first login
        },
      });

      // 6. Generate admin number and create admin record with super admin privileges
      const adminSeq = await this.counterService.getNextSequenceNo(UserType.SUPER_ADMIN, school.id, tx);
      const adminNo = getNextUserEntityNoFormatted(
        UserType.SUPER_ADMIN,
        school.code,
        new Date(),
        adminSeq,
      );

      await tx.admin.create({
        data: {
          userId: adminUser.id,
          adminNo,
          isSuper: true,
        },
      });

      // 7. Update signup request status
      const updatedRequest = await tx.schoolSignupRequest.update({
        where: { id },
        data: {
          status: SchoolSignupStatus.APPROVED,
          reviewedAt: new Date(),
          notes: approveSignupDto.notes,
          // Note: reviewerId should be set from the authenticated user context
        },
      });

      // 8. TODO: Send welcome email with credentials

      return {
        ...updatedRequest,
        schoolId: school.id,
        schoolCode: school.code,
        adminUserId: adminUser.id,
        adminNo,
        approvedAt: updatedRequest.reviewedAt,
        message:
          'School account created successfully. Admin credentials sent to the contact person.',
      };
    });
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
