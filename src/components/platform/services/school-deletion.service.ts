import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, SchoolDeletionRequestStatus, UserType } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from '../../../utils/mail/mail.service';
import { BaseService } from '../../../common/base-service';
import { CancelSchoolDeletionDto } from '../dto/cancel-school-deletion.dto';
import { DeletionRequestsQueryDto } from '../dto/deletion-requests-query.dto';
import { RejectSchoolDeletionDto } from '../dto/reject-school-deletion.dto';
import { RequestSchoolDeletionDto } from '../dto/request-school-deletion.dto';

/** Length of the reconsideration window shown to the super-admin. */
export const DELETION_REVIEW_WINDOW_DAYS = 30;

const REQUEST_LIST_INCLUDE = {
  school: {
    select: {
      id: true,
      name: true,
      code: true,
      primaryAddress: {
        select: { city: true, state: true },
      },
      _count: { select: { users: true } },
    },
  },
  requestedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  },
  cancelledBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  executedBy: {
    select: {
      id: true,
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  },
  rejectedBy: {
    select: {
      id: true,
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  },
} satisfies Prisma.SchoolDeletionRequestInclude;

@Injectable()
export class SchoolDeletionService extends BaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    super(SchoolDeletionService.name);
  }

  // ───────────────────────────── super-admin side ─────────────────────────────

  /**
   * Ensures the acting user is a school super-admin, then returns the user
   * along with their school.
   */
  private async loadSuperAdminContext(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        school: { select: { id: true, name: true, deletionRequestedAt: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.type !== UserType.SUPER_ADMIN || !user.schoolId || !user.school) {
      throw new ForbiddenException(
        'Only a school super-admin may manage deletion requests for their school',
      );
    }

    return {
      user,
      school: user.school,
    };
  }

  async getCurrentForSchool(userId: string) {
    const { school } = await this.loadSuperAdminContext(userId);
    const request = await this.prisma.schoolDeletionRequest.findFirst({
      where: { schoolId: school.id, status: SchoolDeletionRequestStatus.PENDING },
      include: REQUEST_LIST_INCLUDE,
    });
    return {
      school: {
        id: school.id,
        name: school.name,
        deletionRequestedAt: school.deletionRequestedAt,
      },
      request,
      reviewWindowDays: DELETION_REVIEW_WINDOW_DAYS,
    };
  }

  async requestForCurrentSchool(userId: string, dto: RequestSchoolDeletionDto) {
    const { user, school } = await this.loadSuperAdminContext(userId);

    if (school.deletionRequestedAt) {
      throw new BadRequestException('A deletion request is already pending for this school');
    }

    const requestedAt = new Date();
    const reviewableAt = new Date(requestedAt);
    reviewableAt.setDate(reviewableAt.getDate() + DELETION_REVIEW_WINDOW_DAYS);

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.schoolDeletionRequest.create({
        data: {
          schoolId: school.id,
          requestedById: user.id,
          reason: dto.reason,
          requestedAt,
          reviewableAt,
        },
        include: REQUEST_LIST_INCLUDE,
      });

      await tx.school.update({
        where: { id: school.id },
        data: { deletionRequestedAt: requestedAt },
      });

      return created;
    });

    await this.sendRequestedEmail(request).catch((err) => {
      // Don't fail the request if email delivery blips — log and move on.
      this.logger.error('Failed to send school deletion email', err);
    });

    return {
      request,
      reviewWindowDays: DELETION_REVIEW_WINDOW_DAYS,
    };
  }

  async cancelForCurrentSchool(userId: string, dto: CancelSchoolDeletionDto) {
    const { user, school } = await this.loadSuperAdminContext(userId);

    const pending = await this.prisma.schoolDeletionRequest.findFirst({
      where: { schoolId: school.id, status: SchoolDeletionRequestStatus.PENDING },
    });
    if (!pending) {
      throw new BadRequestException('No pending deletion request to cancel');
    }

    const cancelledAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const request = await tx.schoolDeletionRequest.update({
        where: { id: pending.id },
        data: {
          status: SchoolDeletionRequestStatus.CANCELLED,
          cancelledAt,
          cancelledById: user.id,
          cancellationNote: dto.note,
        },
        include: REQUEST_LIST_INCLUDE,
      });
      await tx.school.update({
        where: { id: school.id },
        data: { deletionRequestedAt: null },
      });
      return request;
    });

    await this.sendCancelledEmail(updated).catch((err) => {
      this.logger.error('Failed to send deletion-cancelled email', err);
    });

    return updated;
  }

  // ──────────────────────────── platform-admin side ────────────────────────────

  async list(query: DeletionRequestsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.SchoolDeletionRequestWhereInput = {};
    if (query.status) where.status = query.status;

    const [requests, total, summary] = await Promise.all([
      this.prisma.schoolDeletionRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
        include: REQUEST_LIST_INCLUDE,
      }),
      this.prisma.schoolDeletionRequest.count({ where }),
      this.prisma.schoolDeletionRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const statusCounts = Object.fromEntries(
      Object.values(SchoolDeletionRequestStatus).map((s) => [s, 0]),
    ) as Record<SchoolDeletionRequestStatus, number>;
    for (const row of summary) {
      statusCounts[row.status] = row._count._all;
    }

    return {
      requests,
      summary: statusCounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getOne(id: string) {
    const request = await this.prisma.schoolDeletionRequest.findUnique({
      where: { id },
      include: REQUEST_LIST_INCLUDE,
    });
    if (!request) throw new NotFoundException('Deletion request not found');
    return request;
  }

  async executeRequest(id: string, actingSystemAdminUserId: string) {
    const admin = await this.prisma.systemAdmin.findUnique({
      where: { userId: actingSystemAdminUserId },
    });
    if (!admin) {
      throw new ForbiddenException('Only platform system admins can execute deletions');
    }

    const request = await this.prisma.schoolDeletionRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Deletion request not found');
    if (request.status !== SchoolDeletionRequestStatus.PENDING) {
      throw new BadRequestException(
        `Deletion request is not pending (current: ${request.status.toLowerCase()})`,
      );
    }

    const executedAt = new Date();

    // Execution marks the school as soft-deleted. Full data purge is still
    // deliberately out of scope — platform admins remove records through the
    // manual data-retention process, so this step only finalises the request.
    const updated = await this.prisma.$transaction(async (tx) => {
      const r = await tx.schoolDeletionRequest.update({
        where: { id },
        data: {
          status: SchoolDeletionRequestStatus.EXECUTED,
          executedAt,
          executedById: admin.id,
        },
        include: REQUEST_LIST_INCLUDE,
      });
      await tx.school.update({
        where: { id: r.schoolId },
        data: {
          deletedAt: executedAt,
          deletionRequestedAt: null,
        },
      });
      return r;
    });

    await this.sendExecutedEmail(updated).catch((err) => {
      this.logger.error('Failed to send deletion-executed email', err);
    });

    return updated;
  }

  async rejectRequest(id: string, dto: RejectSchoolDeletionDto, actingSystemAdminUserId: string) {
    const admin = await this.prisma.systemAdmin.findUnique({
      where: { userId: actingSystemAdminUserId },
    });
    if (!admin) {
      throw new ForbiddenException('Only platform system admins can reject requests');
    }

    const request = await this.prisma.schoolDeletionRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Deletion request not found');
    if (request.status !== SchoolDeletionRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    const rejectedAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const r = await tx.schoolDeletionRequest.update({
        where: { id },
        data: {
          status: SchoolDeletionRequestStatus.REJECTED,
          rejectedAt,
          rejectedById: admin.id,
          rejectionReason: dto.reason,
        },
        include: REQUEST_LIST_INCLUDE,
      });
      await tx.school.update({
        where: { id: r.schoolId },
        data: { deletionRequestedAt: null },
      });
      return r;
    });

    return updated;
  }

  // ───────────────────────────── emails ─────────────────────────────

  private getAdminPortalUrl(): string {
    const base =
      this.configService.get<string>('adminAppBaseUrl') ||
      this.configService.get<string>('frontendBaseUrl') ||
      'https://admin.schos.ng';
    return base;
  }

  private async sendRequestedEmail(
    request: Prisma.SchoolDeletionRequestGetPayload<{
      include: typeof REQUEST_LIST_INCLUDE;
    }>,
  ) {
    const requester = request.requestedBy;
    if (!requester.email) return;

    const reviewableDate = request.reviewableAt.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const cancelUrl = `${this.getAdminPortalUrl()}/cancel-delete-request`;

    await this.mailService.sendEmail({
      recipientAddress: requester.email,
      recipientName: `${requester.firstName} ${requester.lastName}`,
      subject: `Deletion request received — ${request.school.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a">
          <h2 style="margin-bottom:4px">We received your deletion request</h2>
          <p style="margin:8px 0 16px;color:#666">For <strong>${request.school.name}</strong> · requested ${request.requestedAt.toLocaleString('en-NG')}</p>

          <p>Hi ${requester.firstName},</p>
          <p>
            You've requested that <strong>${request.school.name}</strong> be removed from the Schos platform.
          </p>

          <div style="background:#fafaf9;border:1px solid #eee;border-radius:8px;padding:16px 20px;margin:20px 0">
            <p style="margin:0 0 6px;font-weight:600">What happens next</p>
            <ul style="margin:0;padding-left:20px;line-height:1.6">
              <li>All other users of your school have been locked out of the platform, effective immediately.</li>
              <li>You (as super-admin) can still sign in to cancel the request at any time before <strong>${reviewableDate}</strong>.</li>
              <li>Your data will not be purged automatically. A Schos platform administrator will review your request and decide when and whether to permanently delete the account.</li>
            </ul>
          </div>

          <p style="margin:16px 0">
            Changed your mind? You can cancel and restore access for all staff and students in a single click:
          </p>
          <p style="text-align:center;margin:22px 0">
            <a href="${cancelUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:500">Cancel deletion request</a>
          </p>

          <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
          <p style="font-size:12px;color:#888;line-height:1.5">
            Reason on file: ${request.reason}<br />
            If you didn't make this request, contact <a href="mailto:support@schos.ng">support@schos.ng</a> immediately.
          </p>
        </div>
      `,
    });
  }

  private async sendCancelledEmail(
    request: Prisma.SchoolDeletionRequestGetPayload<{
      include: typeof REQUEST_LIST_INCLUDE;
    }>,
  ) {
    const requester = request.requestedBy;
    if (!requester.email) return;

    await this.mailService.sendEmail({
      recipientAddress: requester.email,
      recipientName: `${requester.firstName} ${requester.lastName}`,
      subject: `Deletion cancelled — ${request.school.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a">
          <h2>Deletion request cancelled</h2>
          <p>Hi ${requester.firstName},</p>
          <p>
            The deletion request for <strong>${request.school.name}</strong> has been cancelled.
            Access for all staff and students has been restored. No data was removed.
          </p>
          <p style="color:#666;font-size:13px;margin-top:20px">
            If this wasn't you, contact <a href="mailto:support@schos.ng">support@schos.ng</a>.
          </p>
        </div>
      `,
    });
  }

  private async sendExecutedEmail(
    request: Prisma.SchoolDeletionRequestGetPayload<{
      include: typeof REQUEST_LIST_INCLUDE;
    }>,
  ) {
    const requester = request.requestedBy;
    if (!requester.email) return;

    await this.mailService.sendEmail({
      recipientAddress: requester.email,
      recipientName: `${requester.firstName} ${requester.lastName}`,
      subject: `Your school account has been closed — ${request.school.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a">
          <h2>Account closed</h2>
          <p>Hi ${requester.firstName},</p>
          <p>
            Your account for <strong>${request.school.name}</strong> has been closed by a Schos administrator.
            A member of our team will be in touch regarding final data retention steps.
          </p>
          <p style="color:#666;font-size:13px;margin-top:20px">
            Questions? Reply to this email or contact <a href="mailto:support@schos.ng">support@schos.ng</a>.
          </p>
        </div>
      `,
    });
  }
}
