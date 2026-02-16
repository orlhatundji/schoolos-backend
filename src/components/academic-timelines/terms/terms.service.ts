import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TermsRepository } from './terms.repository';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { TermMessages } from './results/messages';
import { Term } from './types';
import { BaseService } from '../../../common/base-service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TermsService extends BaseService {
  constructor(
    private readonly termsRepository: TermsRepository,
    private readonly prisma: PrismaService,
  ) {
    super(TermsService.name);
  }

  async createTerm(data: CreateTermDto): Promise<Term> {
    // Convert string dates to Date objects for Prisma
    const termData = {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    };
    return this.termsRepository.create(termData);
  }

  async getAllTerms(): Promise<Term[]> {
    return this.termsRepository.findAll();
  }

  async getTermById(id: string): Promise<Term> {
    const term = await this.termsRepository.findById(id);
    if (!term) {
      throw new NotFoundException(TermMessages.FAILURE.TERM_NOT_FOUND);
    }
    return term;
  }

  async updateTerm(id: string, data: UpdateTermDto): Promise<Term> {
    // Convert string dates to Date objects for Prisma if they exist
    const updateData = {
      ...data,
      ...(data.startDate && { startDate: new Date(data.startDate) }),
      ...(data.endDate && { endDate: new Date(data.endDate) }),
    };
    return this.termsRepository.update({ id }, updateData);
  }

  async deleteTerm(id: string): Promise<Term> {
    // Check if term has associated assessments
    const assessmentCount = await this.prisma.classArmStudentAssessment.count({
      where: { termId: id, deletedAt: null },
    });

    if (assessmentCount > 0) {
      throw new BadRequestException(
        'Cannot delete term. It has associated assessments. Please remove all assessments first.',
      );
    }

    // Check if term has student attendance records
    const attendanceRecords = await this.prisma.studentAttendance.count({
      where: { termId: id },
    });

    if (attendanceRecords > 0) {
      throw new BadRequestException(
        'Cannot delete term. It has student attendance records. Please remove all attendance records first.',
      );
    }

    // Check if term has payment structures
    const paymentStructures = await this.prisma.paymentStructure.count({
      where: { termId: id },
    });

    if (paymentStructures > 0) {
      throw new BadRequestException(
        'Cannot delete term. It has payment structures. Please remove all payment structures first.',
      );
    }

    return this.termsRepository.delete({ id });
  }

  async lockTerm(id: string): Promise<Term> {
    await this.getTermById(id);
    return this.termsRepository.update({ id }, { isLocked: true });
  }

  async unlockTerm(id: string): Promise<Term> {
    await this.getTermById(id);
    return this.termsRepository.update({ id }, { isLocked: false });
  }

  async setCurrentTerm(id: string): Promise<Term> {
    // First, get the term to find its academic session
    const term = await this.getTermById(id);
    
    // Use a transaction to ensure all operations succeed or fail together
    return this.prisma.$transaction(async (tx) => {
      // Set ALL terms across ALL sessions to not current
      await tx.term.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });

      // Set ALL academic sessions to not current
      await tx.academicSession.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });

      // Set the academic session of this term as current
      await tx.academicSession.update({
        where: { id: term.academicSessionId },
        data: { isCurrent: true },
      });

      // Set the specified term as current
      return tx.term.update({
        where: { id },
        data: { isCurrent: true },
      });
    });
  }

}
