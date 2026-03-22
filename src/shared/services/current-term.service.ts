import { Injectable, NotFoundException } from '@nestjs/common';
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
    if (school?.currentTermId) return school.currentTermId;

    // Auto-resolve if school has terms but no currentTermId set
    const resolved = await this.autoResolveCurrentTerm(schoolId);
    return resolved?.term.id ?? null;
  }

  /**
   * Get the current term with its parent academic session.
   * This is the most common pattern — most services need both.
   * If currentTermId is null but the school has sessions/terms, auto-sets the most recent term.
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
        currentTermId: true,
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

    if (school?.currentTerm) {
      const { academicSession, ...term } = school.currentTerm;
      return { term, session: academicSession };
    }

    // Auto-resolve: find the most recent term for this school and set it as current
    return this.autoResolveCurrentTerm(schoolId);
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

    if (!school?.currentTerm?.academicSession || !school.currentTermId) {
      // Auto-resolve if possible
      const resolved = await this.autoResolveCurrentTerm(schoolId);
      if (!resolved) return null;

      // Re-fetch with all terms now that currentTermId is set
      return this.getCurrentSessionWithTerms(schoolId);
    }

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

  /**
   * Auto-resolve: when currentTermId is null, find the most recent term
   * for this school, set it as current, and return the data.
   * This self-heals schools that were created without setting a current term.
   */
  private async autoResolveCurrentTerm(schoolId: string): Promise<{
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
    // Pick the first term of the most recent session (not the latest term overall).
    // Schools that never set a current term are likely just starting out.
    const latestTerm = await this.prisma.term.findFirst({
      where: {
        deletedAt: null,
        academicSession: { schoolId, deletedAt: null },
      },
      orderBy: [{ academicSession: { startDate: 'desc' } }, { startDate: 'asc' }],
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
    });

    if (!latestTerm) return null;

    // Persist so this only happens once
    await this.prisma.school.update({
      where: { id: schoolId },
      data: { currentTermId: latestTerm.id },
    });

    const { academicSession, ...term } = latestTerm;
    return { term, session: academicSession };
  }
}
