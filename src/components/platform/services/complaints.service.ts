import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { AddComplaintCommentDto } from '../dto/add-complaint-comment.dto';
import { AssignComplaintDto } from '../dto/assign-complaint.dto';
import { CreateComplaintDto } from '../dto/create-complaint.dto';
import { UpdateComplaintDto } from '../dto/update-complaint.dto';

@Injectable()
export class ComplaintsService {
  constructor(private readonly prisma: PrismaService) {}

  async getComplaints(params: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    category?: string;
  }) {
    const { page = 1, limit = 10, status, priority, category } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }
    if (category) {
      where.category = category;
    }

    const [complaints, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          school: {
            select: {
              name: true,
              code: true,
            },
          },
          assignedTo: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
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
        },
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return {
      complaints,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getComplaint(id: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        school: {
          select: {
            name: true,
            code: true,
          },
        },
        assignedTo: {
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
        attachments: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
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

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    return complaint;
  }

  async createComplaint(createComplaintDto: CreateComplaintDto) {
    return this.prisma.complaint.create({
      data: {
        ...createComplaintDto,
        priority: createComplaintDto.priority || 'MEDIUM',
      },
      include: {
        reporter: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        school: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });
  }

  async updateComplaint(id: string, updateComplaintDto: UpdateComplaintDto) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    const updateData: any = { ...updateComplaintDto };

    // Set resolvedAt if status is being changed to RESOLVED
    if (updateComplaintDto.status === 'RESOLVED' && complaint.status !== 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    // Set closedAt if status is being changed to CLOSED
    if (updateComplaintDto.status === 'CLOSED' && complaint.status !== 'CLOSED') {
      updateData.closedAt = new Date();
    }

    return this.prisma.complaint.update({
      where: { id },
      data: updateData,
      include: {
        reporter: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        school: {
          select: {
            name: true,
            code: true,
          },
        },
        assignedTo: {
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
  }

  async assignComplaint(id: string, assignComplaintDto: AssignComplaintDto) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    return this.prisma.complaint.update({
      where: { id },
      data: {
        assignedToId: assignComplaintDto.assignedToId,
        status: 'IN_PROGRESS',
      },
      include: {
        assignedTo: {
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
  }

  async addComment(id: string, addCommentDto: AddComplaintCommentDto) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    // Note: authorId should be set from the authenticated user context
    return this.prisma.complaintComment.create({
      data: {
        complaintId: id,
        content: addCommentDto.content,
        isInternal: addCommentDto.isInternal || false,
        authorId: 'system-admin-id', // This should come from the authenticated user
      },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async getComments(id: string) {
    return this.prisma.complaintComment.findMany({
      where: { complaintId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }
}
