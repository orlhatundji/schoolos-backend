import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePaymentStructureDto } from './dto/create-payment-structure.dto';
import { GeneratePaymentsDto } from './dto/generate-payments.dto';
import { UpdatePaymentStructureDto } from './dto/update-payment-structure.dto';
import { PaymentStructuresRepository } from './payment-structures.repository';

interface ScopeFields {
  academicSessionId?: string;
  termId?: string;
  levelId?: string;
  classArmId?: string;
  classArmIds?: string[];
}

@Injectable()
export class PaymentStructuresService {
  constructor(
    private readonly paymentStructuresRepository: PaymentStructuresRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createPaymentStructure(schoolId: string, dto: CreatePaymentStructureDto) {
    await this.validateScopeFields(dto, schoolId);
    return this.paymentStructuresRepository.create({ ...dto, schoolId });
  }

  getAllPaymentStructures(schoolId: string) {
    return this.paymentStructuresRepository.findAll(schoolId);
  }

  async getPaymentStructureById(schoolId: string, id: string) {
    const paymentStructure = await this.paymentStructuresRepository.findOne(id, schoolId);
    if (!paymentStructure) {
      throw new NotFoundException('Payment structure not found or access denied');
    }
    return paymentStructure;
  }

  async updatePaymentStructure(schoolId: string, id: string, dto: UpdatePaymentStructureDto) {
    const existingPaymentStructure = await this.paymentStructuresRepository.findOne(id, schoolId);
    if (!existingPaymentStructure) {
      throw new NotFoundException('Payment structure not found or access denied');
    }

    if (this.dtoHasScopeFields(dto)) {
      await this.validateScopeFields(dto, schoolId);
    }

    return this.paymentStructuresRepository.update(id, dto);
  }

  async deletePaymentStructure(schoolId: string, id: string) {
    const existingPaymentStructure = await this.paymentStructuresRepository.findOne(id, schoolId);
    if (!existingPaymentStructure) {
      throw new NotFoundException('Payment structure not found or access denied');
    }

    const studentPaymentsCount = await this.prisma.studentPayment.count({
      where: { paymentStructureId: id, deletedAt: null },
    });
    if (studentPaymentsCount > 0) {
      throw new BadRequestException(
        'Cannot delete payment structure. It has associated student payments. Please remove all student payments first.',
      );
    }

    await this.paymentStructuresRepository.delete(id);
    return { message: 'Payment structure deleted successfully' };
  }

  async generateStudentPayments(
    schoolId: string,
    paymentStructureId: string,
    dto: GeneratePaymentsDto,
  ) {
    const paymentStructure = await this.paymentStructuresRepository.findOne(
      paymentStructureId,
      schoolId,
    );
    if (!paymentStructure) {
      throw new NotFoundException('Payment structure not found or access denied');
    }

    if (this.dtoHasScopeFields(dto)) {
      await this.validateScopeFields(dto, schoolId);
    }

    const eligibleStudents = await this.findEligibleStudents(
      schoolId,
      dto.levelId,
      dto.classArmIds,
    );

    const studentPayments = await this.prisma.$transaction(async (tx) => {
      const created: { id: string }[] = [];
      for (const student of eligibleStudents) {
        const existingPayment = await tx.studentPayment.findFirst({
          where: { studentId: student.id, paymentStructureId, deletedAt: null },
          select: { id: true },
        });
        if (existingPayment) continue;

        const payment = await tx.studentPayment.create({
          data: {
            studentId: student.id,
            paymentStructureId,
            amount: paymentStructure.amount,
            currency: paymentStructure.currency,
            dueDate: paymentStructure.dueDate ?? new Date(),
          },
          select: { id: true },
        });
        created.push(payment);
      }
      return created;
    });

    return {
      message: `Generated ${studentPayments.length} student payments`,
      count: studentPayments.length,
    };
  }

  private dtoHasScopeFields(dto: Partial<ScopeFields>): boolean {
    return Boolean(
      dto.academicSessionId ||
        dto.termId ||
        dto.levelId ||
        dto.classArmId ||
        dto.classArmIds?.length,
    );
  }

  private async validateScopeFields(dto: ScopeFields, schoolId: string): Promise<void> {
    if (dto.academicSessionId) {
      const academicSession = await this.prisma.academicSession.findFirst({
        where: { id: dto.academicSessionId, schoolId, deletedAt: null },
        select: { id: true },
      });
      if (!academicSession) {
        throw new BadRequestException(
          'Academic session not found or does not belong to this school',
        );
      }
    }

    if (dto.termId) {
      const term = await this.prisma.term.findFirst({
        where: {
          id: dto.termId,
          academicSession: { schoolId, deletedAt: null },
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!term) {
        throw new BadRequestException('Term not found or does not belong to this school');
      }
    }

    if (dto.levelId) {
      const level = await this.prisma.level.findFirst({
        where: { id: dto.levelId, schoolId, deletedAt: null },
        select: { id: true },
      });
      if (!level) {
        throw new BadRequestException('Level not found or does not belong to this school');
      }
    }

    if (dto.classArmIds?.length) {
      const classArms = await this.prisma.classArm.findMany({
        where: { id: { in: dto.classArmIds }, schoolId, deletedAt: null },
        select: { id: true },
      });
      if (classArms.length !== dto.classArmIds.length) {
        throw new BadRequestException(
          'One or more class arms not found or do not belong to this school',
        );
      }
    }
  }

  private findEligibleStudents(schoolId: string, levelId?: string, classArmIds?: string[]) {
    const classArmStudentFilter: {
      isActive: boolean;
      classArmId?: { in: string[] };
      classArm?: { levelId: string };
    } = { isActive: true };

    if (classArmIds?.length) {
      classArmStudentFilter.classArmId = { in: classArmIds };
    } else if (levelId) {
      classArmStudentFilter.classArm = { levelId };
    }

    return this.prisma.student.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        user: { schoolId },
        classArmStudents: { some: classArmStudentFilter },
      },
      include: {
        classArmStudents: {
          where: { isActive: true },
          include: { classArm: { include: { level: true } } },
        },
      },
    });
  }
}
