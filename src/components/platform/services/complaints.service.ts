import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ComplaintStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { AddComplaintCommentDto } from '../dto/add-complaint-comment.dto';
import { AssignComplaintDto } from '../dto/assign-complaint.dto';
import { ComplaintsQueryDto } from '../dto/complaints-query.dto';
import { UpdateComplaintStatusDto } from '../dto/update-complaint-status.dto';

const COMPLAINT_LIST_INCLUDE = {
  reporter: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  school: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  },
  _count: {
    select: {
      comments: true,
      attachments: true,
    },
  },
} satisfies Prisma.ComplaintInclude;

const COMPLAINT_DETAIL_INCLUDE = {
  reporter: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  school: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  },
  comments: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          type: true,
        },
      },
    },
  },
  attachments: {
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.ComplaintInclude;

@Injectable()
export class ComplaintsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ComplaintsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ComplaintWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.category) where.category = query.category;
    if (query.schoolId) where.schoolId = query.schoolId;
    if (query.assignedToId) where.assignedToId = query.assignedToId;

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [complaints, total, statusCounts] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          // Keep open issues at the top regardless of createdAt
          { status: 'asc' },
          { createdAt: 'desc' },
        ],
        include: COMPLAINT_LIST_INCLUDE,
      }),
      this.prisma.complaint.count({ where }),
      this.prisma.complaint.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const summary = Object.fromEntries(
      Object.values(ComplaintStatus).map((s) => [s, 0]),
    ) as Record<ComplaintStatus, number>;
    for (const row of statusCounts) {
      summary[row.status] = row._count._all;
    }

    return {
      complaints,
      summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getOne(id: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: COMPLAINT_DETAIL_INCLUDE,
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    return complaint;
  }

  async updateStatus(
    complaintId: string,
    dto: UpdateComplaintStatusDto,
    actingUserId: string,
  ) {
    const existing = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
    });
    if (!existing) {
      throw new NotFoundException('Complaint not found');
    }

    if (existing.status === dto.status) {
      throw new BadRequestException(
        `Complaint is already ${dto.status.toLowerCase()}`,
      );
    }

    const data: Prisma.ComplaintUpdateInput = { status: dto.status };
    const now = new Date();

    if (dto.status === ComplaintStatus.RESOLVED) {
      data.resolvedAt = now;
    } else if (dto.status === ComplaintStatus.CLOSED) {
      data.closedAt = now;
      // If resolution wasn't recorded, capture it at close time.
      if (!existing.resolvedAt) data.resolvedAt = now;
    } else if (dto.status === ComplaintStatus.OPEN) {
      data.resolvedAt = null;
      data.closedAt = null;
    }

    return this.prisma.$transaction(async (tx) => {
      const complaint = await tx.complaint.update({
        where: { id: complaintId },
        data,
        include: COMPLAINT_DETAIL_INCLUDE,
      });

      if (dto.note) {
        await tx.complaintComment.create({
          data: {
            complaintId,
            authorId: actingUserId,
            content: `[${dto.status.toLowerCase()}] ${dto.note}`,
            isInternal: true,
          },
        });
      }

      return complaint;
    });
  }

  async pickUp(complaintId: string, actingUserId: string) {
    const admin = await this.prisma.systemAdmin.findUnique({
      where: { userId: actingUserId },
    });
    if (!admin) {
      throw new BadRequestException(
        'Only platform system admins can pick up complaints',
      );
    }
    return this.assign(complaintId, { systemAdminId: admin.id });
  }

  async assign(complaintId: string, dto: AssignComplaintDto) {
    const [complaint, admin] = await Promise.all([
      this.prisma.complaint.findUnique({ where: { id: complaintId } }),
      this.prisma.systemAdmin.findUnique({ where: { id: dto.systemAdminId } }),
    ]);

    if (!complaint) throw new NotFoundException('Complaint not found');
    if (!admin) throw new NotFoundException('System admin not found');

    const data: Prisma.ComplaintUpdateInput = {
      assignedTo: { connect: { id: dto.systemAdminId } },
    };
    // Picking up an open complaint should move it to IN_PROGRESS.
    if (complaint.status === ComplaintStatus.OPEN) {
      data.status = ComplaintStatus.IN_PROGRESS;
    }

    return this.prisma.complaint.update({
      where: { id: complaintId },
      data,
      include: COMPLAINT_DETAIL_INCLUDE,
    });
  }

  async unassign(complaintId: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');

    return this.prisma.complaint.update({
      where: { id: complaintId },
      data: { assignedTo: { disconnect: true } },
      include: COMPLAINT_DETAIL_INCLUDE,
    });
  }

  async addComment(
    complaintId: string,
    dto: AddComplaintCommentDto,
    authorUserId: string,
  ) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');

    return this.prisma.complaintComment.create({
      data: {
        complaintId,
        authorId: authorUserId,
        content: dto.content,
        isInternal: dto.isInternal ?? false,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            type: true,
          },
        },
      },
    });
  }
}
