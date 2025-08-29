import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateStudentPaymentDto } from './dto/update-student-payment.dto';

@Injectable()
export class StudentPaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(schoolId: string, filters?: any) {
    const whereClause: any = {
      student: {
        user: {
          schoolId,
        },
        deletedAt: null,
      },
      deletedAt: null,
    };

    // Add filters
    if (filters?.status) {
      whereClause.status = filters.status;
    }

    if (filters?.studentId) {
      whereClause.studentId = filters.studentId;
    }

    if (filters?.paymentStructureId) {
      whereClause.paymentStructureId = filters.paymentStructureId;
    }

    if (filters?.dueDateFrom) {
      whereClause.dueDate = {
        ...whereClause.dueDate,
        gte: new Date(filters.dueDateFrom),
      };
    }

    if (filters?.dueDateTo) {
      whereClause.dueDate = {
        ...whereClause.dueDate,
        lte: new Date(filters.dueDateTo),
      };
    }

    return this.prisma.studentPayment.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            user: true,
            classArm: {
              include: {
                level: true,
              },
            },
          },
        },
        paymentStructure: {
          include: {
            academicSession: true,
            term: true,
            level: true,
            classArm: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
  }

  async findOne(id: string, schoolId: string) {
    return this.prisma.studentPayment.findFirst({
      where: {
        id,
        student: {
          user: {
            schoolId,
          },
          deletedAt: null,
        },
        deletedAt: null,
      },
      include: {
        student: {
          include: {
            user: true,
            classArm: {
              include: {
                level: true,
              },
            },
          },
        },
        paymentStructure: {
          include: {
            academicSession: true,
            term: true,
            level: true,
            classArm: true,
          },
        },
      },
    });
  }

  async findByStudent(studentId: string, schoolId: string) {
    return this.prisma.studentPayment.findMany({
      where: {
        studentId,
        student: {
          user: {
            schoolId,
          },
          deletedAt: null,
        },
        deletedAt: null,
      },
      include: {
        paymentStructure: {
          include: {
            academicSession: true,
            term: true,
            level: true,
            classArm: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
  }

  async update(id: string, data: UpdateStudentPaymentDto) {
    return this.prisma.studentPayment.update({
      where: { id },
      data: {
        ...data,
        ...(data.paidAmount !== undefined && { paidAmount: data.paidAmount }),
        ...(data.status && { status: data.status }),
        ...(data.paidAt !== undefined && { paidAt: data.paidAt ? new Date(data.paidAt) : null }),
        ...(data.waivedBy && { waivedBy: data.waivedBy }),
        ...(data.waivedAt !== undefined && { waivedAt: data.waivedAt ? new Date(data.waivedAt) : null }),
        ...(data.waiverReason && { waiverReason: data.waiverReason }),
      },
      include: {
        student: {
          include: {
            user: true,
            classArm: {
              include: {
                level: true,
              },
            },
          },
        },
        paymentStructure: {
          include: {
            academicSession: true,
            term: true,
            level: true,
            classArm: true,
          },
        },
      },
    });
  }

  async getPaymentStatistics(schoolId: string) {
    const payments = await this.prisma.studentPayment.findMany({
      where: {
        student: {
          user: {
            schoolId,
          },
          deletedAt: null,
        },
        deletedAt: null,
      },
      select: {
        status: true,
        amount: true,
        paidAmount: true,
        dueDate: true,
      },
    });

    const totalAmount = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.paidAmount), 0);
    const totalPending = totalAmount - totalPaid;

    const statusCounts = payments.reduce((acc, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const overdueCount = payments.filter(
      payment => payment.status === 'PENDING' && payment.dueDate < new Date(),
    ).length;

    return {
      totalAmount,
      totalPaid,
      totalPending,
      statusCounts,
      overdueCount,
      totalPayments: payments.length,
    };
  }
}
