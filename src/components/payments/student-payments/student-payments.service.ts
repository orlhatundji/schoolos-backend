import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { PaystackService } from '../../../shared/services/paystack.service';
import { UpdateStudentPaymentDto } from './dto/update-student-payment.dto';
import { StudentPaymentsRepository } from './student-payments.repository';

@Injectable()
export class StudentPaymentsService {
  private readonly logger = new Logger(StudentPaymentsService.name);

  constructor(
    private readonly studentPaymentsRepository: StudentPaymentsRepository,
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
  ) {}

  async getAllStudentPayments(userId: string, filters?: any) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    return this.studentPaymentsRepository.findAll(user.schoolId, filters);
  }

  async getStudentPaymentById(userId: string, id: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    const studentPayment = await this.studentPaymentsRepository.findOne(id, user.schoolId);

    if (!studentPayment) {
      throw new NotFoundException('Student payment not found or access denied');
    }

    return studentPayment;
  }

  async getStudentPaymentsByStudent(userId: string, studentId: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    // Verify the student belongs to the user's school
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        user: {
          schoolId: user.schoolId,
        },
        deletedAt: null,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found or access denied');
    }

    return this.studentPaymentsRepository.findByStudent(studentId, user.schoolId);
  }

  async updateStudentPayment(
    userId: string,
    id: string,
    updateStudentPaymentDto: UpdateStudentPaymentDto,
  ) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    // Verify the student payment belongs to the user's school
    const existingPayment = await this.studentPaymentsRepository.findOne(id, user.schoolId);

    if (!existingPayment) {
      throw new NotFoundException('Student payment not found or access denied');
    }

    // Validate payment updates
    await this.validatePaymentUpdate(existingPayment, updateStudentPaymentDto);

    // Update the student payment
    const studentPayment = await this.studentPaymentsRepository.update(id, {
      ...updateStudentPaymentDto,
      ...(updateStudentPaymentDto.waivedBy && { waivedBy: updateStudentPaymentDto.waivedBy }),
      ...(updateStudentPaymentDto.waivedAt && { waivedAt: updateStudentPaymentDto.waivedAt }),
    });

    return studentPayment;
  }

  async markPaymentAsPaid(userId: string, id: string, paidAmount: number, paidAt?: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    // Verify the student payment belongs to the user's school
    const existingPayment = await this.studentPaymentsRepository.findOne(id, user.schoolId);

    if (!existingPayment) {
      throw new NotFoundException('Student payment not found or access denied');
    }

    // Validate paid amount
    if (paidAmount <= 0) {
      throw new BadRequestException('Paid amount must be greater than 0');
    }

    if (paidAmount > Number(existingPayment.amount)) {
      throw new BadRequestException('Paid amount cannot exceed the total amount');
    }

    // Determine payment status
    let status = 'PARTIAL';
    if (paidAmount === Number(existingPayment.amount)) {
      status = 'PAID';
    }

    // Update the payment
    const studentPayment = await this.studentPaymentsRepository.update(id, {
      paidAmount,
      status: status as any,
      paidAt: paidAt || new Date().toISOString(),
    });

    return studentPayment;
  }

  async waivePayment(userId: string, id: string, waiverReason: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    // Verify the student payment belongs to the user's school
    const existingPayment = await this.studentPaymentsRepository.findOne(id, user.schoolId);

    if (!existingPayment) {
      throw new NotFoundException('Student payment not found or access denied');
    }

    if (existingPayment.status === 'PAID') {
      throw new BadRequestException('Cannot waive a payment that has already been paid');
    }

    // Update the payment
    const studentPayment = await this.studentPaymentsRepository.update(id, {
      status: 'WAIVED',
      waivedBy: userId,
      waivedAt: new Date().toISOString(),
      waiverReason,
    });

    return studentPayment;
  }

  async getPaymentStatistics(userId: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    return this.studentPaymentsRepository.getPaymentStatistics(user.schoolId);
  }

  async verifyPaymentByReference(userId: string, reference: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    // Verify with Paystack
    const paystackResponse = await this.paystackService.verifyPayment(reference);

    if (paystackResponse.data.status !== 'success') {
      throw new BadRequestException(
        `Payment not successful on Paystack. Status: ${paystackResponse.data.status}`,
      );
    }

    // Find the student payment by reference in notes
    const studentPayment = await this.prisma.studentPayment.findFirst({
      where: {
        notes: { contains: reference },
        student: { user: { schoolId: user.schoolId } },
        deletedAt: null,
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
        paymentStructure: true,
      },
    });

    if (!studentPayment) {
      throw new NotFoundException(
        `No payment record found for reference "${reference}" in your school`,
      );
    }

    // Check if already fully paid
    if (studentPayment.status === 'PAID') {
      return {
        message: 'Payment was already marked as paid',
        alreadyProcessed: true,
        payment: studentPayment,
      };
    }

    // Use PlatformTransaction feeAmount if available, otherwise convert from kobo
    const platformTx = await this.prisma.platformTransaction.findUnique({
      where: { paymentReference: reference },
    });

    const amountToCredit = platformTx
      ? Number(platformTx.feeAmount)
      : this.paystackService.convertFromKobo(paystackResponse.data.amount);

    const newPaidAmount = Number(studentPayment.paidAmount) + amountToCredit;
    const totalAmount = Number(studentPayment.amount);
    const newStatus = newPaidAmount >= totalAmount ? 'PAID' : 'PARTIAL';

    const updatedPayment = await this.prisma.studentPayment.update({
      where: { id: studentPayment.id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
        paidAt: new Date(),
        notes: `Payment verified manually by admin. Reference: ${reference}. Amount credited: ${amountToCredit}`,
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
        paymentStructure: true,
      },
    });

    // Update PlatformTransaction if exists
    if (platformTx && platformTx.status !== 'SETTLED') {
      await this.prisma.platformTransaction.update({
        where: { id: platformTx.id },
        data: { status: 'SETTLED', settledAt: new Date() },
      });
    }

    this.logger.log(
      `Admin ${userId} manually verified payment ${studentPayment.id} with reference ${reference}. Credited: ${amountToCredit}`,
    );

    return {
      message: `Payment verified and credited successfully. Status: ${newStatus}`,
      alreadyProcessed: false,
      amountCredited: amountToCredit,
      payment: updatedPayment,
    };
  }

  private async validatePaymentUpdate(existingPayment: any, updateDto: UpdateStudentPaymentDto) {
    // Validate status transitions
    if (updateDto.status) {
      const validTransitions = {
        PENDING: ['PAID', 'PARTIAL', 'WAIVED'],
        PARTIAL: ['PAID', 'WAIVED'],
        PAID: [], // Cannot change from PAID
        OVERDUE: ['PAID', 'PARTIAL', 'WAIVED'],
        WAIVED: [], // Cannot change from WAIVED
      };

      const currentStatus = existingPayment.status;
      const newStatus = updateDto.status;

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        throw new BadRequestException(
          `Invalid status transition from ${currentStatus} to ${newStatus}`,
        );
      }
    }

    // Validate paid amount
    if (updateDto.paidAmount !== undefined) {
      if (updateDto.paidAmount < 0) {
        throw new BadRequestException('Paid amount cannot be negative');
      }

      if (updateDto.paidAmount > Number(existingPayment.amount)) {
        throw new BadRequestException('Paid amount cannot exceed the total amount');
      }
    }

    // Validate waiver fields
    if (updateDto.waivedBy || updateDto.waivedAt || updateDto.waiverReason) {
      if (!updateDto.waivedBy || !updateDto.waiverReason) {
        throw new BadRequestException(
          'Both waivedBy and waiverReason are required when waiving a payment',
        );
      }
    }
  }
}
