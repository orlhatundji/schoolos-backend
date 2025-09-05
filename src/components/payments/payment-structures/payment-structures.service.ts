import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaymentStructuresRepository } from './payment-structures.repository';
import { CreatePaymentStructureDto } from './dto/create-payment-structure.dto';
import { UpdatePaymentStructureDto } from './dto/update-payment-structure.dto';

@Injectable()
export class PaymentStructuresService {
  constructor(
    private readonly paymentStructuresRepository: PaymentStructuresRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createPaymentStructure(
    userId: string,
    createPaymentStructureDto: CreatePaymentStructureDto,
  ) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    // Validate scope fields
    await this.validateScopeFields(createPaymentStructureDto, user.schoolId);

    // Create the payment structure
    const paymentStructure = await this.paymentStructuresRepository.create({
      ...createPaymentStructureDto,
      schoolId: user.schoolId,
      ...(createPaymentStructureDto.dueDate && { dueDate: createPaymentStructureDto.dueDate }),
    });

    return paymentStructure;
  }

  async getAllPaymentStructures(userId: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    return this.paymentStructuresRepository.findAll(user.schoolId);
  }

  async getPaymentStructureById(userId: string, id: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    const paymentStructure = await this.paymentStructuresRepository.findOne(id, user.schoolId);

    if (!paymentStructure) {
      throw new NotFoundException('Payment structure not found or access denied');
    }

    return paymentStructure;
  }

  async updatePaymentStructure(
    userId: string,
    id: string,
    updatePaymentStructureDto: UpdatePaymentStructureDto,
  ) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    // Verify the payment structure belongs to the user's school
    const existingPaymentStructure = await this.paymentStructuresRepository.findOne(
      id,
      user.schoolId,
    );

    if (!existingPaymentStructure) {
      throw new NotFoundException('Payment structure not found or access denied');
    }

    // Validate scope fields if provided
    if (
      Object.keys(updatePaymentStructureDto).some((key) =>
        ['academicSessionId', 'termId', 'levelId', 'classArmId'].includes(key),
      )
    ) {
      await this.validateScopeFields(updatePaymentStructureDto, user.schoolId);
    }

    // Update the payment structure
    const paymentStructure = await this.paymentStructuresRepository.update(id, {
      ...updatePaymentStructureDto,
      ...(updatePaymentStructureDto.dueDate && { dueDate: updatePaymentStructureDto.dueDate }),
    });

    return paymentStructure;
  }

  async deletePaymentStructure(userId: string, id: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    // Verify the payment structure belongs to the user's school
    const existingPaymentStructure = await this.paymentStructuresRepository.findOne(
      id,
      user.schoolId,
    );

    if (!existingPaymentStructure) {
      throw new NotFoundException('Payment structure not found or access denied');
    }

    // Check if payment structure has associated student payments
    const studentPaymentsCount = await this.prisma.studentPayment.count({
      where: {
        paymentStructureId: id,
        deletedAt: null,
      },
    });

    if (studentPaymentsCount > 0) {
      throw new BadRequestException(
        'Cannot delete payment structure. It has associated student payments. Please remove all student payments first.',
      );
    }

    await this.paymentStructuresRepository.delete(id);

    return { message: 'Payment structure deleted successfully' };
  }

  async generateStudentPayments(userId: string, paymentStructureId: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    // Get the payment structure
    const paymentStructure = await this.paymentStructuresRepository.findOne(
      paymentStructureId,
      user.schoolId,
    );

    if (!paymentStructure) {
      throw new NotFoundException('Payment structure not found or access denied');
    }

    // Find eligible students based on the payment structure scope
    const eligibleStudents = await this.findEligibleStudents(paymentStructure);

    // Generate student payments
    const studentPayments = await this.prisma.$transaction(async (tx) => {
      const payments = [];

      for (const student of eligibleStudents) {
        // Check if payment already exists
        const existingPayment = await tx.studentPayment.findFirst({
          where: {
            studentId: student.id,
            paymentStructureId: paymentStructureId,
            deletedAt: null,
          },
        });

        if (!existingPayment) {
          const payment = await tx.studentPayment.create({
            data: {
              studentId: student.id,
              paymentStructureId: paymentStructureId,
              amount: paymentStructure.amount,
              currency: paymentStructure.currency,
              dueDate: paymentStructure.dueDate || new Date(),
            },
          });
          payments.push(payment);
        }
      }

      return payments;
    });

    return {
      message: `Generated ${studentPayments.length} student payments`,
      count: studentPayments.length,
    };
  }

  private async validateScopeFields(dto: any, schoolId: string) {
    // Validate academic session if provided
    if (dto.academicSessionId) {
      const academicSession = await this.prisma.academicSession.findFirst({
        where: {
          id: dto.academicSessionId,
          schoolId,
          deletedAt: null,
        },
      });

      if (!academicSession) {
        throw new BadRequestException(
          'Academic session not found or does not belong to this school',
        );
      }
    }

    // Validate term if provided
    if (dto.termId) {
      const term = await this.prisma.term.findFirst({
        where: {
          id: dto.termId,
          academicSession: {
            schoolId,
            deletedAt: null,
          },
          deletedAt: null,
        },
      });

      if (!term) {
        throw new BadRequestException('Term not found or does not belong to this school');
      }
    }

    // Validate level if provided
    if (dto.levelId) {
      const level = await this.prisma.level.findFirst({
        where: {
          id: dto.levelId,
          schoolId,
          deletedAt: null,
        },
      });

      if (!level) {
        throw new BadRequestException('Level not found or does not belong to this school');
      }
    }

    // Validate class arm if provided
    if (dto.classArmId) {
      const classArm = await this.prisma.classArm.findFirst({
        where: {
          id: dto.classArmId,
          schoolId,
          deletedAt: null,
        },
      });

      if (!classArm) {
        throw new BadRequestException('Class arm not found or does not belong to this school');
      }
    }
  }

  private async findEligibleStudents(paymentStructure: any) {
    const whereClause: any = {
      schoolId: paymentStructure.schoolId,
      deletedAt: null,
    };

    // Add scope filters
    if (paymentStructure.levelId) {
      whereClause.classArm = {
        levelId: paymentStructure.levelId,
      };
    }

    if (paymentStructure.classArmId) {
      whereClause.classArmId = paymentStructure.classArmId;
    }

    return this.prisma.student.findMany({
      where: whereClause,
      include: {
        classArm: {
          include: {
            level: true,
          },
        },
      },
    });
  }
}
