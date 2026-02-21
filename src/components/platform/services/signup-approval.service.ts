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
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SignupApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordGenerator: PasswordGenerator,
    private readonly passwordHasher: PasswordHasher,
    private readonly mailService: MailService,
    private readonly counterService: CounterService,
    private readonly configService: ConfigService,
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

    // Type cast the JSON data
    const contactPersonData = request.contactPerson as any;

    // Generate secure admin password before transaction
    const adminPassword = this.passwordGenerator.generate();

    // Use transaction to ensure data consistency
    const result = await this.prisma.$transaction(async (tx) => {
      const addressData = request.address as any;

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

      // 4. Hash admin password
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

      return {
        ...updatedRequest,
        schoolId: school.id,
        schoolCode: school.code,
        schoolName: school.name,
        adminUserId: adminUser.id,
        adminNo,
        approvedAt: updatedRequest.reviewedAt,
      };
    });

    // 8. Send welcome email with credentials (after transaction commits)
    await this.sendWelcomeEmail({
      email: contactPersonData.email,
      firstName: contactPersonData.firstName,
      lastName: contactPersonData.lastName,
      schoolName: result.schoolName,
      adminNo: result.adminNo,
      password: adminPassword,
    });

    return {
      ...result,
      message: 'School account created successfully. Admin credentials sent to the contact person.',
    };
  }

  private async sendWelcomeEmail(data: {
    email: string;
    firstName: string;
    lastName: string;
    schoolName: string;
    adminNo: string;
    password: string;
  }) {
    const { email, firstName, lastName, schoolName, adminNo, password } = data;
    const adminAppBaseUrl = this.configService.get<string>('adminAppBaseUrl') || this.configService.get<string>('frontendBaseUrl');
    const adminPortalUrl = adminAppBaseUrl ? `${adminAppBaseUrl}/login` : 'https://admin.schos.ng/login';

    await this.mailService.sendEmail({
      recipientAddress: email,
      recipientName: `${firstName} ${lastName}`,
      subject: `Welcome to Schos - Your ${schoolName} Admin Account`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Schos!</h2>
          <p>Hi ${firstName},</p>
          <p>Your school <strong>${schoolName}</strong> has been successfully registered on Schos. Below are your administrator login credentials:</p>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Admin ID:</strong> ${adminNo}</p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${password}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${adminPortalUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Access Admin Portal</a>
          </div>

          <p style="color: #e74c3c;"><strong>Important:</strong> For security reasons, you will be required to change your password upon first login.</p>

          <p>If you have any questions or need assistance, please contact us:</p>
          <ul style="list-style: none; padding: 0;">
            <li>Email: <a href="mailto:support@schos.ng">support@schos.ng</a></li>
            <li>Phone: <a href="tel:+2347012211243">+234 701 221 1243</a></li>
          </ul>

          <p>Best regards,<br/>The Schos Team</p>
        </div>
      `,
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
