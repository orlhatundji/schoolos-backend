import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AcademicSessionsRepository } from './academic-sessions.repository';
import { CreateAcademicSessionDto } from './dto/create-academic-session.dto';
import { CreateTermForSessionDto } from './dto/create-term-for-session.dto';
import { UpdateAcademicSessionDto } from './dto/update-academic-session.dto';
import { AcademicSessionMessages } from './results/messages';
import { AcademicSession } from './types';
import { BaseService } from '../../../common/base-service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AcademicSessionsService extends BaseService {
  constructor(
    private readonly academicSessionsRepository: AcademicSessionsRepository,
    private readonly prisma: PrismaService,
  ) {
    super(AcademicSessionsService.name);
  }

  /**
   * Creates a new academic session with the following behavior:
   * - Creates the academic session and assessment structure template
   * - Creates terms for the session in the same transaction
   * - Does NOT automatically create class arms (must be done manually or during promotion)
   * 
   * @param userId - The ID of the user creating the session
   * @param dto - The academic session data including terms array
   * @returns The created academic session
   * @throws BadRequestException if no terms are provided or if terms array is empty
   */
  async createAcademicSession(
    userId: string,
    dto: CreateAcademicSessionDto,
  ): Promise<AcademicSession> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException(
        'User not associated with a school. Only school users can create academic sessions.',
      );
    }

    // Add schoolId to the DTO and extract terms separately
    const { terms, ...sessionData } = dto;
    const dataWithSchoolId = {
      ...sessionData,
      schoolId: user.schoolId,
    };

    // Use a transaction to ensure all operations succeed or fail together
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the academic session
      const newSession = await tx.academicSession.create({
        data: dataWithSchoolId,
      });

      // Create assessment structure template for the new session
      await this.createAssessmentStructureForNewSessionInTransaction(
        tx,
        user.schoolId,
        newSession.id,
      );

      // Create terms for the new session
      await this.createTermsForNewSessionInTransaction(tx, newSession.id, dto.terms);

      // Note: Class arms are now created manually or during student promotion
      // Automatic creation has been removed to prevent slug conflicts and allow manual control

      return newSession;
    });

    return result;
  }

  async getAcademicSessionById(userId: string, id: string): Promise<AcademicSession> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException(
        'User not associated with a school. Only school users can view academic sessions.',
      );
    }

    const academicSession = await this.academicSessionsRepository.findOne({
      where: {
        id,
        schoolId: user.schoolId,
      },
    });

    if (!academicSession) {
      throw new NotFoundException(AcademicSessionMessages.FAILURE.SESSION_NOT_FOUND);
    }

    return academicSession;
  }

  async getAllAcademicSessions(userId: string): Promise<AcademicSession[]> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException(
        'User not associated with a school. Only school users can view academic sessions.',
      );
    }

    return this.academicSessionsRepository.findAll({
      where: { schoolId: user.schoolId },
      include: {
        terms: {
          where: {
            deletedAt: null,
          },
        },
      },
    });
  }

  async updateAcademicSession(
    userId: string,
    id: string,
    data: UpdateAcademicSessionDto,
  ): Promise<AcademicSession> {
    await this.getAcademicSessionById(userId, id);

    // Extract terms from the update data if present
    const { terms, ...sessionData } = data;
    
    // Update the academic session (without terms)
    const updatedSession = await this.academicSessionsRepository.update({ id }, sessionData);
    
    // If terms are provided, update them as well
    if (terms && terms.length > 0) {
      // Note: This is a simplified approach. In a real scenario, you might want to:
      // 1. Delete existing terms and create new ones, or
      // 2. Update existing terms and create new ones, or
      // 3. Provide a more sophisticated term management API
      throw new BadRequestException(
        'Term updates are not supported through the session update endpoint. Please use the dedicated term management endpoints.',
      );
    }

    return updatedSession;
  }

  async deleteAcademicSession(userId: string, id: string): Promise<AcademicSession> {
    await this.getAcademicSessionById(userId, id);

    // Check if academic session has associated class arms
    const classArms = await this.prisma.classArm.findMany({
      where: { academicSessionId: id },
      include: {
        classArmStudents: {
          where: {
            isActive: true,
            deletedAt: null,
          },
        },
        classArmSubjects: {
          include: { teachers: { where: { deletedAt: null } } },
        },
        classArmTeachers: true,
      },
    });

    // If class arms exist, check if they can be safely deleted
    if (classArms.length > 0) {
      // Check if any class arms have students or teacher assignments
      const hasStudents = classArms.some((classArm) => classArm.classArmStudents.length > 0);
      const hasTeacherAssignments = classArms.some(
        (classArm) =>
          classArm.classArmSubjects.some((cas) => cas.teachers.length > 0) || classArm.classArmTeachers.length > 0,
      );

      if (hasStudents) {
        throw new BadRequestException(
          'Cannot delete academic session. It has class arms with enrolled students. Please remove all students from class arms first.',
        );
      }

      if (hasTeacherAssignments) {
        throw new BadRequestException(
          'Cannot delete academic session. It has class arms with teacher assignments. Please remove all teacher assignments first.',
        );
      }

      // If class arms exist but have no students or teacher assignments, delete them first
      await this.prisma.classArm.deleteMany({
        where: { academicSessionId: id },
      });
    }
    // If no class arms exist or they have been cleaned up, proceed with session deletion

    // Check if academic session has terms
    const terms = await this.prisma.term.findMany({
      where: { academicSessionId: id },
    });

    // If session has terms, we need to be more careful about deletion
    if (terms.length > 0) {
      // Check if any terms have associated data that would prevent deletion
      const termsWithData = await this.prisma.term.findMany({
        where: { 
          academicSessionId: id,
          OR: [
            { assessments: { some: {} } },
            { studentAttendances: { some: {} } },
            { paymentStructures: { some: {} } }
          ]
        },
      });

      if (termsWithData.length > 0) {
        throw new BadRequestException(
          'Cannot delete academic session. It has terms with associated data (subjects, assessments, or attendance records). Please remove all associated data first.',
        );
      }
    }

    // Check if academic session has associated assessments
    const assessmentCount = await this.prisma.classArmStudentAssessment.count({
      where: {
        classArmSubject: {
          classArm: { academicSessionId: id },
        },
        deletedAt: null,
      },
    });

    if (assessmentCount > 0) {
      throw new BadRequestException(
        'Cannot delete academic session. It has associated assessments. Please remove all assessments first.',
      );
    }

    // Delete associated assessment structure templates
    await this.prisma.assessmentStructureTemplate.deleteMany({
      where: { academicSessionId: id },
    });

    // Delete associated academic session calendar items first
    await this.prisma.academicSessionCalendarItem.deleteMany({
      where: { 
        calendar: {
          academicSessionId: id
        }
      },
    });

    // Delete associated academic session calendar
    await this.prisma.academicSessionCalendar.deleteMany({
      where: { academicSessionId: id },
    });

    // Delete associated terms
    await this.prisma.term.deleteMany({
      where: { academicSessionId: id },
    });

    // Delete any remaining related data (ClassArmSubjects for this session's class arms)
    await this.prisma.classArmSubject.deleteMany({
      where: { classArm: { academicSessionId: id } },
    });

    await this.prisma.paymentStructure.deleteMany({
      where: { academicSessionId: id },
    });

    await this.prisma.studentPromotion.deleteMany({
      where: {
        OR: [
          { fromAcademicSessionId: id },
          { toAcademicSessionId: id }
        ]
      },
    });

    return this.academicSessionsRepository.delete({ id });
  }

  async getSessionWithCurrentTerm(userId: string): Promise<AcademicSession | null> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException(
        'User not associated with a school. Only school users can view academic sessions.',
      );
    }

    // Find the academic session that contains the current term
    const sessionWithCurrentTerm = await this.prisma.academicSession.findFirst({
      where: {
        schoolId: user.schoolId,
        terms: {
          some: {
            isCurrent: true,
          },
        },
      },
      include: {
        terms: {
          where: {
            isCurrent: true,
          },
        },
      },
    });

    return sessionWithCurrentTerm;
  }

  private async createAssessmentStructureForNewSessionInTransaction(
    tx: any,
    schoolId: string,
    academicSessionId: string,
  ) {
    const { randomUUID } = await import('crypto');

    try {
      // Check if a template already exists for this session
      const existingTemplate = await tx.assessmentStructureTemplate.findFirst({
        where: {
          schoolId,
          academicSessionId,
          isActive: true,
          deletedAt: null,
        },
      });

      if (existingTemplate) {
        return;
      }

      // Try to copy from the most recent session's template
      const previousTemplate = await tx.assessmentStructureTemplate.findFirst({
        where: {
          schoolId,
          academicSessionId: { not: academicSessionId },
          isActive: true,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (previousTemplate) {
        const previousAssessments = previousTemplate.assessments as any[];
        const newAssessments = previousAssessments.map((a: any) => ({
          ...a,
          id: randomUUID(),
        }));

        await tx.assessmentStructureTemplate.create({
          data: {
            schoolId,
            academicSessionId,
            name: previousTemplate.name,
            description: previousTemplate.description,
            assessments: newAssessments,
            isActive: true,
          },
        });
        return;
      }

      // Try global default template
      const globalDefault = await tx.assessmentStructureTemplate.findFirst({
        where: {
          isGlobalDefault: true,
          isActive: true,
          deletedAt: null,
        },
      });

      if (globalDefault) {
        const defaultAssessments = (globalDefault.assessments as any[]).map((a: any) => ({
          ...a,
          id: randomUUID(),
        }));

        await tx.assessmentStructureTemplate.create({
          data: {
            schoolId,
            academicSessionId,
            name: globalDefault.name,
            description: globalDefault.description,
            assessments: defaultAssessments,
            isActive: true,
          },
        });
        return;
      }

      // Fallback to hardcoded defaults
      const defaultAssessments = [
        {
          id: randomUUID(),
          name: 'CA 1',
          description: 'First continuous assessment test',
          maxScore: 20,
          isExam: false,
          order: 1,
        },
        {
          id: randomUUID(),
          name: 'CA 2',
          description: 'Second continuous assessment test',
          maxScore: 20,
          isExam: false,
          order: 2,
        },
        {
          id: randomUUID(),
          name: 'Exam',
          description: 'Final examination',
          maxScore: 60,
          isExam: true,
          order: 3,
        },
      ];

      await tx.assessmentStructureTemplate.create({
        data: {
          schoolId,
          academicSessionId,
          name: 'Standard Assessment Structure',
          description: 'Standard assessment structure for all subjects',
          assessments: defaultAssessments,
          isActive: true,
        },
      });
    } catch (error) {
      console.error('Error creating assessment structure template for new session:', error);
      // Don't throw error to avoid breaking session creation
    }
  }

  /**
   * Creates terms for a new academic session within a transaction.
   * @param tx - The Prisma transaction client
   * @param academicSessionId - The ID of the academic session
   * @param terms - Array of term data to create
   */
  private async createTermsForNewSessionInTransaction(
    tx: any,
    academicSessionId: string,
    terms: CreateTermForSessionDto[],
  ): Promise<void> {
    try {
      if (!terms || terms.length === 0) {
        throw new BadRequestException(
          'At least one term must be provided when creating an academic session.',
        );
      }

      // Create each term
      for (const termData of terms) {
        await tx.term.create({
          data: {
            name: termData.name,
            startDate: new Date(termData.startDate),
            endDate: new Date(termData.endDate),
            academicSessionId,
          },
        });
      }
    } catch (error) {
      console.error('❌ Error creating terms for new session:', error);
      throw error; // Re-throw to ensure transaction rollback
    }
  }

}
