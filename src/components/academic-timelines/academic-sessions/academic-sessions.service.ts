import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AcademicSessionsRepository } from './academic-sessions.repository';
import { CreateAcademicSessionDto } from './dto/create-academic-session.dto';
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

    // Add schoolId to the DTO
    const dataWithSchoolId = {
      ...dto,
      schoolId: user.schoolId,
    };

    // Use a transaction to ensure both operations succeed or fail together
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

      // Create class arms for the new session
      await this.createClassArmsForNewSessionInTransaction(tx, user.schoolId, newSession.id);

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
    });
  }

  async updateAcademicSession(
    userId: string,
    id: string,
    data: UpdateAcademicSessionDto,
  ): Promise<AcademicSession> {
    await this.getAcademicSessionById(userId, id);

    return this.academicSessionsRepository.update({ id }, data);
  }

  async deleteAcademicSession(userId: string, id: string): Promise<AcademicSession> {
    await this.getAcademicSessionById(userId, id);

    // Check if academic session has associated class arms
    const classArms = await this.prisma.classArm.findMany({
      where: { academicSessionId: id },
      include: {
        students: true,
        classArmSubjectTeachers: true,
        classArmTeachers: true,
      },
    });

    if (classArms.length > 0) {
      // Check if any class arms have students or teacher assignments
      const hasStudents = classArms.some((classArm) => classArm.students.length > 0);
      const hasTeacherAssignments = classArms.some(
        (classArm) =>
          classArm.classArmSubjectTeachers.length > 0 || classArm.classArmTeachers.length > 0,
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

    // Check if academic session has associated subject terms with student enrollments
    const subjectTerms = await this.prisma.subjectTerm.findMany({
      where: { academicSessionId: id },
      include: {
        subjectTermStudents: true,
      },
    });

    // Check if any subject terms have student enrollments
    for (const subjectTerm of subjectTerms) {
      if (subjectTerm.subjectTermStudents.length > 0) {
        throw new BadRequestException(
          'Cannot delete academic session. It has associated student enrollments. Please remove all student enrollments first.',
        );
      }
    }

    // Delete associated assessment structure templates
    await this.prisma.assessmentStructureTemplate.deleteMany({
      where: { academicSessionId: id },
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
    try {
      // Check if school already has assessment structures for this session
      const existingStructures = await tx.assessmentStructure.findMany({
        where: {
          schoolId,
          academicSessionId,
          isActive: true,
          deletedAt: null,
        },
      });

      if (existingStructures.length > 0) {
        return;
      }

      // Try to find the most recent session's assessment structures to copy from
      const mostRecentSessionWithStructures = await tx.academicSession.findFirst({
        where: {
          schoolId,
          id: { not: academicSessionId },
          assessmentStructures: {
            some: {
              isActive: true,
              deletedAt: null,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          assessmentStructures: {
            where: {
              isActive: true,
              deletedAt: null,
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      if (mostRecentSessionWithStructures?.assessmentStructures?.length > 0) {
        // Copy assessment structures from previous session
        for (const structure of mostRecentSessionWithStructures.assessmentStructures) {
          await tx.assessmentStructure.create({
            data: {
              schoolId,
              academicSessionId,
              name: structure.name,
              description: structure.description,
              maxScore: structure.maxScore,
              isExam: structure.isExam,
              order: structure.order,
              isActive: true,
            },
          });
        }

        // Also copy the assessment structure template
        const previousTemplate = await tx.assessmentStructureTemplate.findFirst({
          where: {
            schoolId,
            academicSessionId: mostRecentSessionWithStructures.id,
            isActive: true,
            deletedAt: null,
          },
        });

        if (previousTemplate) {
          await tx.assessmentStructureTemplate.create({
            data: {
              schoolId,
              academicSessionId,
              name: previousTemplate.name,
              description: previousTemplate.description,
              assessments: previousTemplate.assessments,
              isActive: true,
            },
          });
        }
        return;
      }

      // Try to use global default template first
      const globalDefault = await tx.assessmentStructureTemplate.findFirst({
        where: {
          isGlobalDefault: true,
          isActive: true,
          deletedAt: null,
        },
      });

      let defaultStructures;
      if (globalDefault) {
        // Use global default template
        defaultStructures = globalDefault.assessments as any[];
      } else {
        // Fallback to hardcoded defaults
        defaultStructures = [
          {
            name: 'CA 1',
            description: 'First continuous assessment test',
            maxScore: 20,
            isExam: false,
            order: 1,
          },
          {
            name: 'CA 2',
            description: 'Second continuous assessment test',
            maxScore: 20,
            isExam: false,
            order: 2,
          },
          {
            name: 'Exam',
            description: 'Final examination',
            maxScore: 60,
            isExam: true,
            order: 3,
          },
        ];
      }

      for (const structure of defaultStructures) {
        await tx.assessmentStructure.create({
          data: {
            schoolId,
            academicSessionId,
            name: structure.name,
            description: structure.description,
            maxScore: structure.maxScore,
            isExam: structure.isExam,
            order: structure.order,
            isActive: true,
          },
        });
      }

      // Also create assessment structure template
      try {
        await tx.assessmentStructureTemplate.create({
          data: {
            schoolId,
            academicSessionId,
            name: 'Standard Assessment Structure',
            description: 'Standard assessment structure for all subjects',
            assessments: defaultStructures,
            isActive: true,
          },
        });
      } catch (templateError) {
        console.error('❌ Error creating assessment structure template:', templateError);
        // Don't throw error to avoid breaking session creation
      }
    } catch (error) {
      console.error('❌ Error creating assessment structures for new session:', error);
      // Don't throw error to avoid breaking session creation
    }
  }

  private async createAssessmentStructureForNewSession(
    schoolId: string,
    academicSessionId: string,
  ) {
    try {
      // Check if school already has assessment structures for this session
      const existingStructures = await this.prisma.assessmentStructure.findMany({
        where: {
          schoolId,
          academicSessionId,
          isActive: true,
          deletedAt: null,
        },
      });

      if (existingStructures.length > 0) {
        return;
      }

      // Try to find the most recent session's assessment structures to copy from
      const mostRecentSessionWithStructures = await this.prisma.academicSession.findFirst({
        where: {
          schoolId,
          id: { not: academicSessionId },
          assessmentStructures: {
            some: {
              isActive: true,
              deletedAt: null,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          assessmentStructures: {
            where: {
              isActive: true,
              deletedAt: null,
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      if (mostRecentSessionWithStructures?.assessmentStructures?.length > 0) {
        // Copy assessment structures from previous session
        for (const structure of mostRecentSessionWithStructures.assessmentStructures) {
          await this.prisma.assessmentStructure.create({
            data: {
              schoolId,
              academicSessionId,
              name: structure.name,
              description: structure.description,
              maxScore: structure.maxScore,
              isExam: structure.isExam,
              order: structure.order,
              isActive: true,
            },
          });
        }

        // Also copy the assessment structure template
        const previousTemplate = await this.prisma.assessmentStructureTemplate.findFirst({
          where: {
            schoolId,
            academicSessionId: mostRecentSessionWithStructures.id,
            isActive: true,
            deletedAt: null,
          },
        });

        if (previousTemplate) {
          await this.prisma.assessmentStructureTemplate.create({
            data: {
              schoolId,
              academicSessionId,
              name: previousTemplate.name,
              description: previousTemplate.description,
              assessments: previousTemplate.assessments,
              isActive: true,
            },
          });
        }
        return;
      }

      // Try to use global default template first
      const globalDefault = await this.prisma.assessmentStructureTemplate.findFirst({
        where: {
          isGlobalDefault: true,
          isActive: true,
          deletedAt: null,
        },
      });

      let defaultStructures;
      if (globalDefault) {
        // Use global default template
        defaultStructures = globalDefault.assessments as any[];
      } else {
        // Fallback to hardcoded defaults
        defaultStructures = [
          {
            name: 'Cont. Ass. 1',
            description: 'First continuous assessment test',
            maxScore: 20,
            isExam: false,
            order: 1,
          },
          {
            name: 'Cont. Ass. 2',
            description: 'Second continuous assessment test',
            maxScore: 20,
            isExam: false,
            order: 2,
          },
          {
            name: 'Examination',
            description: 'Final examination',
            maxScore: 60,
            isExam: true,
            order: 3,
          },
        ];
      }

      for (const structure of defaultStructures) {
        await this.prisma.assessmentStructure.create({
          data: {
            schoolId,
            academicSessionId,
            name: structure.name,
            description: structure.description,
            maxScore: structure.maxScore,
            isExam: structure.isExam,
            order: structure.order,
            isActive: true,
          },
        });
      }

      // Also create assessment structure template
      try {
        await this.prisma.assessmentStructureTemplate.create({
          data: {
            schoolId,
            academicSessionId,
            name: 'Standard Assessment Structure',
            description: 'Standard assessment structure for all subjects',
            assessments: defaultStructures,
            isActive: true,
          },
        });
      } catch (templateError) {
        console.error('❌ Error creating assessment structure template:', templateError);
        // Don't throw error to avoid breaking session creation
      }
    } catch (error) {
      console.error('❌ Error creating assessment structures for new session:', error);
      // Don't throw error to avoid breaking session creation
    }
  }

  private async createClassArmsForNewSessionInTransaction(
    tx: any,
    schoolId: string,
    academicSessionId: string,
  ) {
    try {
      // Check if class arms already exist for this session
      const existingClassArms = await tx.classArm.findMany({
        where: {
          schoolId,
          academicSessionId,
          deletedAt: null,
        },
      });

      if (existingClassArms.length > 0) {
        return;
      }

      // Find the most recent session that has class arms with teacher assignments
      const mostRecentSessionWithClassArms = await tx.academicSession.findFirst({
        where: {
          schoolId,
          id: { not: academicSessionId },
          classArms: {
            some: {
              deletedAt: null,
              classArmSubjectTeachers: {
                some: {
                  deletedAt: null,
                },
              },
            },
          },
        },
        include: {
          classArms: {
            where: {
              deletedAt: null,
            },
            include: {
              level: true,
              department: true,
              classArmSubjectTeachers: {
                where: {
                  deletedAt: null,
                },
                include: {
                  subject: true,
                  teacher: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (mostRecentSessionWithClassArms?.classArms) {
        // Copy class arms from the previous session
        for (const classArm of mostRecentSessionWithClassArms.classArms) {
          const newClassArm = await tx.classArm.create({
            data: {
              name: classArm.name,
              levelId: classArm.levelId,
              departmentId: classArm.departmentId,
              schoolId,
              academicSessionId,
              // Note: We don't copy classTeacherId and captainId as these are session-specific
              // Administrators need to assign new class teachers and captains for the new session
            },
          });

          // Copy subject teacher assignments for this class arm
          for (const subjectTeacher of classArm.classArmSubjectTeachers) {
            await tx.classArmSubjectTeacher.create({
              data: {
                classArmId: newClassArm.id,
                subjectId: subjectTeacher.subjectId,
                teacherId: subjectTeacher.teacherId,
              },
            });
          }
        }
      } else {
        // If no previous class arms exist, we could create default ones here
        // For now, we'll leave it to the administrator to set up
      }
    } catch (error) {
      console.error('❌ Error creating class arms for new session:', error);
      // Don't throw error to avoid breaking session creation
    }
  }
}
