import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePaymentStructureDto } from './dto/create-payment-structure.dto';
import { UpdatePaymentStructureDto } from './dto/update-payment-structure.dto';

@Injectable()
export class PaymentStructuresRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePaymentStructureDto & { schoolId: string }) {
    return this.prisma.paymentStructure.create({
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: {
        academicSession: true,
        term: true,
        level: true,
        classArm: true,
      },
    });
  }

  async findAll(schoolId: string) {
    return this.prisma.paymentStructure.findMany({
      where: {
        schoolId,
        deletedAt: null,
      },
      include: {
        academicSession: true,
        term: true,
        level: true,
        classArm: true,
        _count: {
          select: {
            studentPayments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, schoolId: string) {
    return this.prisma.paymentStructure.findFirst({
      where: {
        id,
        schoolId,
        deletedAt: null,
      },
      include: {
        academicSession: true,
        term: true,
        level: true,
        classArm: true,
        studentPayments: {
          include: {
            student: {
              include: {
                user: true,
                classArmStudents: {
                  where: { isActive: true },
                  include: {
                    classArm: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async update(id: string, data: UpdatePaymentStructureDto) {
    return this.prisma.paymentStructure.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: {
        academicSession: true,
        term: true,
        level: true,
        classArm: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.paymentStructure.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findActiveByScope(params: {
    schoolId: string;
    academicSessionId?: string;
    termId?: string;
    levelId?: string;
    classArmId?: string;
  }) {
    return this.prisma.paymentStructure.findMany({
      where: {
        schoolId: params.schoolId,
        isActive: true,
        deletedAt: null,
        ...(params.academicSessionId && { academicSessionId: params.academicSessionId }),
        ...(params.termId && { termId: params.termId }),
        ...(params.levelId && { levelId: params.levelId }),
        ...(params.classArmId && { classArmId: params.classArmId }),
      },
      include: {
        academicSession: true,
        term: true,
        level: true,
        classArm: true,
      },
    });
  }
}
