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
    // Check if term has associated subject terms with student enrollments
    const subjectTerms = await this.prisma.subjectTerm.findMany({
      where: { termId: id },
      include: {
        subjectTermStudents: true,
      },
    });

    // Check if any subject terms have student enrollments
    for (const subjectTerm of subjectTerms) {
      if (subjectTerm.subjectTermStudents.length > 0) {
        throw new BadRequestException(
          'Cannot delete term. It has associated student enrollments. Please remove all student enrollments first.',
        );
      }
    }

    return this.termsRepository.delete({ id });
  }

  async setCurrentTerm(id: string): Promise<Term> {
    // First, get the term to find its academic session
    const term = await this.getTermById(id);
    
    // Set all terms in the same academic session to not current
    await this.prisma.term.updateMany({
      where: { academicSessionId: term.academicSessionId },
      data: { isCurrent: false },
    });

    // Set the specified term as current
    return this.termsRepository.update({ id }, { isCurrent: true });
  }
}
