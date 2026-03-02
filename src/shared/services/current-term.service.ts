import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CurrentTermService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the current term ID for a school.
   */
  async getCurrentTermId(schoolId: string): Promise<string | null> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { currentTermId: true },
    });
    return school?.currentTermId ?? null;
  }

  /**
   * Get the current term with its parent academic session.
   * This is the most common pattern — most services need both.
   */
  async getCurrentTermWithSession(schoolId: string): Promise<{
    term: {
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
      isLocked: boolean;
      academicSessionId: string;
    };
    session: {
      id: string;
      academicYear: string;
      startDate: Date;
      endDate: Date;
    };
  } | null> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        currentTerm: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            isLocked: true,
            academicSessionId: true,
            academicSession: {
              select: {
                id: true,
                academicYear: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
    });

    if (!school?.currentTerm) return null;

    const { academicSession, ...term } = school.currentTerm;
    return { term, session: academicSession };
  }

  /**
   * Get the current session with ALL its terms (for broadsheets, dropdowns, etc.)
   */
  async getCurrentSessionWithTerms(schoolId: string): Promise<{
    session: {
      id: string;
      academicYear: string;
      startDate: Date;
      endDate: Date;
    };
    terms: Array<{
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
      isLocked: boolean;
    }>;
    currentTermId: string;
  } | null> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        currentTermId: true,
        currentTerm: {
          select: {
            academicSession: {
              select: {
                id: true,
                academicYear: true,
                startDate: true,
                endDate: true,
                terms: {
                  where: { deletedAt: null },
                  orderBy: { startDate: 'asc' },
                  select: {
                    id: true,
                    name: true,
                    startDate: true,
                    endDate: true,
                    isLocked: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!school?.currentTerm?.academicSession || !school.currentTermId) return null;

    const { academicSession } = school.currentTerm;
    return {
      session: {
        id: academicSession.id,
        academicYear: academicSession.academicYear,
        startDate: academicSession.startDate,
        endDate: academicSession.endDate,
      },
      terms: academicSession.terms,
      currentTermId: school.currentTermId,
    };
  }

  /**
   * Set the current term for a school.
   * Validates the term belongs to the school.
   */
  async setCurrentTerm(schoolId: string, termId: string): Promise<void> {
    const term = await this.prisma.term.findFirst({
      where: {
        id: termId,
        deletedAt: null,
        academicSession: { schoolId, deletedAt: null },
      },
    });

    if (!term) {
      throw new NotFoundException('Term not found or does not belong to this school');
    }

    await this.prisma.school.update({
      where: { id: schoolId },
      data: { currentTermId: termId },
    });
  }
}
