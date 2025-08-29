import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StudentPaymentsRepository } from './student-payments.repository';
import { UpdateStudentPaymentDto } from './dto/update-student-payment.dto';

@Injectable()
export class StudentPaymentsService {
  constructor(
    private readonly studentPaymentsRepository: StudentPaymentsRepository,
    private readonly prisma: PrismaService,
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

  async updateStudentPayment(userId: string, id: string, updateStudentPaymentDto: UpdateStudentPaymentDto) {
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
        throw new BadRequestException(`Invalid status transition from ${currentStatus} to ${newStatus}`);
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
        throw new BadRequestException('Both waivedBy and waiverReason are required when waiving a payment');
      }
    }
  }
}
