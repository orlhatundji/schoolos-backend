import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, PlatformTransactionOperation } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { assertCanTransition } from '../domain/payment-status.machine';
import { PaymentEventOutcome, PaymentTarget } from '../domain/payment-event-result';
import { PaymentService } from '../payment.service';
import { RequestPaymentDto } from './dto/request-payment.dto';
import { UpdateStudentPaymentDto } from './dto/update-student-payment.dto';
import {
  StudentPaymentsRepository,
  StudentPaymentWithDetails,
} from './student-payments.repository';

@Injectable()
export class StudentPaymentsService {
  private readonly logger = new Logger(StudentPaymentsService.name);

  constructor(
    private readonly studentPaymentsRepository: StudentPaymentsRepository,
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  getAllStudentPayments(schoolId: string, filters?: Record<string, unknown>) {
    return this.studentPaymentsRepository.findAll(schoolId, filters);
  }

  async getStudentPaymentById(schoolId: string, id: string) {
    const studentPayment = await this.studentPaymentsRepository.findOne(id, schoolId);
    if (!studentPayment) {
      throw new NotFoundException('Student payment not found or access denied');
    }
    return studentPayment;
  }

  async getStudentPaymentsByStudent(schoolId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, user: { schoolId }, deletedAt: null },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found or access denied');
    }
    return this.studentPaymentsRepository.findByStudent(studentId, schoolId);
  }

  async updateStudentPayment(
    schoolId: string,
    id: string,
    dto: UpdateStudentPaymentDto,
  ) {
    const existingPayment = await this.requireOwnedPayment(id, schoolId);
    this.validatePaymentUpdate(existingPayment, dto);

    return this.studentPaymentsRepository.update(id, {
      ...dto,
      ...(dto.waivedBy && { waivedBy: dto.waivedBy }),
      ...(dto.waivedAt && { waivedAt: dto.waivedAt }),
    });
  }

  async markPaymentAsPaid(
    schoolId: string,
    id: string,
    paidAmount: number,
    paidAt?: string,
  ) {
    const existingPayment = await this.requireOwnedPayment(id, schoolId);

    if (paidAmount <= 0) {
      throw new BadRequestException('Paid amount must be greater than 0');
    }
    if (paidAmount > Number(existingPayment.amount)) {
      throw new BadRequestException('Paid amount cannot exceed the total amount');
    }

    const newStatus: PaymentStatus =
      paidAmount >= Number(existingPayment.amount) ? PaymentStatus.PAID : PaymentStatus.PARTIAL;
    assertCanTransition(existingPayment.status, newStatus);

    return this.studentPaymentsRepository.update(id, {
      paidAmount,
      status: newStatus,
      paidAt: paidAt ?? new Date().toISOString(),
    });
  }

  async requestPayment(schoolId: string, dto: RequestPaymentDto) {
    const { studentId, paymentStructureId, dueDate, notes } = dto;

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, user: { schoolId }, deletedAt: null },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found or access denied');
    }

    const paymentStructure = await this.prisma.paymentStructure.findFirst({
      where: { id: paymentStructureId, schoolId, deletedAt: null },
    });
    if (!paymentStructure) {
      throw new NotFoundException('Payment structure not found or access denied');
    }

    const duplicate = await this.prisma.studentPayment.findFirst({
      where: { studentId, paymentStructureId, deletedAt: null },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestException(
        'A payment for this structure already exists for this student',
      );
    }

    return this.prisma.studentPayment.create({
      data: {
        studentId,
        paymentStructureId,
        amount: paymentStructure.amount,
        currency: paymentStructure.currency,
        dueDate: dueDate ? new Date(dueDate) : paymentStructure.dueDate ?? new Date(),
        notes,
      },
      include: {
        student: {
          include: {
            user: true,
            classArmStudents: {
              where: { isActive: true },
              include: { classArm: { include: { level: true } } },
            },
          },
        },
        paymentStructure: {
          include: { academicSession: true, term: true, level: true, classArm: true },
        },
      },
    });
  }

  async waivePayment(
    schoolId: string,
    userId: string,
    id: string,
    waiverReason: string,
  ) {
    const existingPayment = await this.requireOwnedPayment(id, schoolId);
    assertCanTransition(existingPayment.status, PaymentStatus.WAIVED);

    return this.studentPaymentsRepository.update(id, {
      status: PaymentStatus.WAIVED,
      waivedBy: userId,
      waivedAt: new Date().toISOString(),
      waiverReason,
    });
  }

  async unwaivePayment(schoolId: string, id: string) {
    const existingPayment = await this.requireOwnedPayment(id, schoolId);
    if (existingPayment.status !== PaymentStatus.WAIVED) {
      throw new BadRequestException('Only waived payments can be unwaived');
    }
    assertCanTransition(existingPayment.status, PaymentStatus.PENDING);

    return this.studentPaymentsRepository.update(id, {
      status: PaymentStatus.PENDING,
      waivedBy: null,
      waivedAt: null,
      waiverReason: null,
    });
  }

  getPaymentStatistics(schoolId: string) {
    return this.studentPaymentsRepository.getPaymentStatistics(schoolId);
  }

  async getTransactionsForPayment(schoolId: string, id: string) {
    await this.requireOwnedPayment(id, schoolId);
    return this.prisma.platformTransaction.findMany({
      where: { operationType: PlatformTransactionOperation.STUDENT_PAYMENT, operationId: id, schoolId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        paymentReference: true,
        totalCharged: true,
        feeAmount: true,
        paystackFee: true,
        currency: true,
        status: true,
        settledAt: true,
        receiptUrl: true,
        createdAt: true,
      },
    });
  }

  async verifyPaymentByReference(schoolId: string, reference: string) {
    const result = await this.paymentService.adminVerifyPaymentByReference(schoolId, reference);

    const studentPaymentId =
      (result.outcome === PaymentEventOutcome.PAYMENT_PROCESSED &&
      result.target === PaymentTarget.STUDENT_PAYMENT
        ? result.studentPaymentId
        : null) ??
      (result.outcome === PaymentEventOutcome.DUPLICATE_EVENT
        ? await (async () => {
            const tx = await this.prisma.platformTransaction.findUnique({
              where: { paymentReference: reference },
              select: { operationType: true, operationId: true },
            });
            return tx?.operationType === PlatformTransactionOperation.STUDENT_PAYMENT ? tx.operationId : null;
          })()
        : null);

    if (!studentPaymentId) {
      throw new NotFoundException(
        `No payment record found for reference "${reference}" in your school`,
      );
    }

    const payment = await this.studentPaymentsRepository.findOne(studentPaymentId, schoolId);
    if (!payment) {
      throw new NotFoundException('Student payment not found after verification');
    }

    if (result.outcome === PaymentEventOutcome.DUPLICATE_EVENT) {
      return {
        message: 'Payment was already marked as paid',
        alreadyProcessed: true,
        payment,
      };
    }

    if (
      result.outcome === PaymentEventOutcome.PAYMENT_PROCESSED &&
      result.target === PaymentTarget.STUDENT_PAYMENT
    ) {
      this.logger.log(
        `Admin verify for ${reference} → processed (${result.studentPaymentId}, ${result.status})`,
      );
      return {
        message: `Payment verified and credited successfully. Status: ${result.status}`,
        alreadyProcessed: false,
        amountCredited: result.amountNaira,
        payment,
      };
    }

    throw new BadRequestException(
      `Unexpected verification outcome: ${result.outcome}`,
    );
  }

  private async requireOwnedPayment(
    id: string,
    schoolId: string,
  ): Promise<StudentPaymentWithDetails> {
    const payment = await this.studentPaymentsRepository.findOne(id, schoolId);
    if (!payment) {
      throw new NotFoundException('Student payment not found or access denied');
    }
    return payment;
  }

  private validatePaymentUpdate(
    existingPayment: StudentPaymentWithDetails,
    dto: UpdateStudentPaymentDto,
  ): void {
    if (dto.status) {
      assertCanTransition(existingPayment.status, dto.status);
    }

    if (dto.paidAmount !== undefined) {
      if (dto.paidAmount < 0) {
        throw new BadRequestException('Paid amount cannot be negative');
      }
      if (dto.paidAmount > Number(existingPayment.amount)) {
        throw new BadRequestException('Paid amount cannot exceed the total amount');
      }
    }

    if (dto.waivedBy || dto.waivedAt || dto.waiverReason) {
      if (!dto.waivedBy || !dto.waiverReason) {
        throw new BadRequestException(
          'Both waivedBy and waiverReason are required when waiving a payment',
        );
      }
    }
  }
}
