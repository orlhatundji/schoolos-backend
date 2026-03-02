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

  async createTerm(data: CreateTermDto, schoolId: string): Promise<Term> {
    // Convert string dates to Date objects for Prisma
    const termData = {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    };
    const term = await this.termsRepository.create(termData);
    const currentTermId = await this.getCurrentTermIdForSchool(schoolId);
    return this.enrichTerm(term, currentTermId);
  }

  async getAllTerms(schoolId: string): Promise<Term[]> {
    const terms = await this.termsRepository.findAll();
    const currentTermId = await this.getCurrentTermIdForSchool(schoolId);
    return terms.map(t => this.enrichTerm(t, currentTermId));
  }

  async getTermById(id: string, schoolId: string): Promise<Term> {
    const term = await this.termsRepository.findById(id);
    if (!term) {
      throw new NotFoundException(TermMessages.FAILURE.TERM_NOT_FOUND);
    }
    const currentTermId = await this.getCurrentTermIdForSchool(schoolId);
    return this.enrichTerm(term, currentTermId);
  }

  async updateTerm(id: string, data: UpdateTermDto, schoolId: string): Promise<Term> {
    // Convert string dates to Date objects for Prisma if they exist
    const updateData = {
      ...data,
      ...(data.startDate && { startDate: new Date(data.startDate) }),
      ...(data.endDate && { endDate: new Date(data.endDate) }),
    };
    const term = await this.termsRepository.update({ id }, updateData);
    const currentTermId = await this.getCurrentTermIdForSchool(schoolId);
    return this.enrichTerm(term, currentTermId);
  }

  async deleteTerm(id: string, schoolId: string): Promise<Term> {
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

    const term = await this.termsRepository.delete({ id });
    return { ...term, isCurrent: false };
  }

  async lockTerm(id: string, schoolId: string): Promise<Term> {
    await this.getTermById(id, schoolId);
    const term = await this.termsRepository.update({ id }, { isLocked: true });
    const currentTermId = await this.getCurrentTermIdForSchool(schoolId);
    return this.enrichTerm(term, currentTermId);
  }

  async unlockTerm(id: string, schoolId: string): Promise<Term> {
    await this.getTermById(id, schoolId);
    const term = await this.termsRepository.update({ id }, { isLocked: false });
    const currentTermId = await this.getCurrentTermIdForSchool(schoolId);
    return this.enrichTerm(term, currentTermId);
  }

  async setCurrentTerm(schoolId: string, termId: string): Promise<Term> {
    // Verify term exists and belongs to this school
    const term = await this.prisma.term.findFirst({
      where: {
        id: termId,
        deletedAt: null,
        academicSession: { schoolId, deletedAt: null },
      },
    });

    if (!term) {
      throw new NotFoundException(TermMessages.FAILURE.TERM_NOT_FOUND);
    }

    // Single atomic update — just point the school to this term
    await this.prisma.school.update({
      where: { id: schoolId },
      data: { currentTermId: termId },
    });

    // The term we just set IS the current one
    return { ...term, isCurrent: true };
  }

  private async getCurrentTermIdForSchool(schoolId: string): Promise<string | null> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { currentTermId: true },
    });
    return school?.currentTermId ?? null;
  }

  private enrichTerm(term: Term, currentTermId: string | null): Term {
    return { ...term, isCurrent: term.id === currentTermId };
  }

}
