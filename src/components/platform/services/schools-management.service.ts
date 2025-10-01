import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SchoolsManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchools(params: { page?: number; limit?: number; search?: string; status?: string }) {
    const { page = 1, limit = 10, search, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      // For now, we'll use a simple approach. In a real system, you might have a status field
      if (status === 'active') {
        where.deletedAt = null;
      }
    }

    const [schools, total] = await Promise.all([
      this.prisma.school.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          primaryAddress: true,
          _count: {
            select: {
              users: true,
              // students: true, // This relation doesn't exist in the current schema
              // teachers: true, // This relation doesn't exist in the current schema
            },
          },
        },
      }),
      this.prisma.school.count({ where }),
    ]);

    return {
      schools,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getSchool(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        primaryAddress: true,
        addresses: {
          include: {
            address: true,
          },
        },
        _count: {
          select: {
            users: true,
            academicSessions: true,
            levels: true,
            departments: true,
            classArms: true,
          },
        },
      },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get additional counts for user types and terms
    const [studentsCount, teachersCount, adminsCount, termsCount] = await Promise.all([
      this.prisma.student.count({
        where: {
          user: {
            schoolId: id,
            deletedAt: null,
          },
        },
      }),
      this.prisma.teacher.count({
        where: {
          user: {
            schoolId: id,
            deletedAt: null,
          },
        },
      }),
      this.prisma.admin.count({
        where: {
          user: {
            schoolId: id,
            deletedAt: null,
          },
        },
      }),
      this.prisma.term.count({
        where: {
          academicSession: {
            schoolId: id,
            deletedAt: null,
          },
          deletedAt: null,
        },
      }),
    ]);

    // Get payment statistics
    const paymentStats = await this.prisma.studentPayment.aggregate({
      where: {
        student: {
          user: {
            schoolId: id,
            deletedAt: null,
          },
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const completedPayments = await this.prisma.studentPayment.aggregate({
      where: {
        student: {
          user: {
            schoolId: id,
            deletedAt: null,
          },
        },
        status: 'PAID',
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const pendingPayments = await this.prisma.studentPayment.aggregate({
      where: {
        student: {
          user: {
            schoolId: id,
            deletedAt: null,
          },
        },
        status: 'PENDING',
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      ...school,
      _count: {
        ...school._count,
        students: studentsCount,
        teachers: teachersCount,
        admins: adminsCount,
        terms: termsCount,
      },
      paymentStats: {
        totalPayments: paymentStats._count.id,
        completedPayments: completedPayments._count.id,
        pendingPayments: pendingPayments._count.id,
        totalAmount: paymentStats._sum.amount || 0,
        completedAmount: completedPayments._sum.amount || 0,
        pendingAmount: pendingPayments._sum.amount || 0,
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateSchoolStatus(id: string, status: string, _reason?: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // For now, we'll use soft delete for deactivation
    if (status === 'inactive') {
      return this.prisma.school.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
    }

    if (status === 'active') {
      return this.prisma.school.update({
        where: { id },
        data: {
          deletedAt: null,
        },
      });
    }

    throw new Error(`Invalid status: ${status}`);
  }
}
