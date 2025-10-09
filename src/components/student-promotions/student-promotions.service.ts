import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../common/base-service';
import { ClassArmStudentService } from '../students/services/class-arm-student.service';
import { CreatePromotionBatchDto } from './dto/create-promotion-batch.dto';
import { PromoteStudentDto } from './dto/promote-student.dto';
import { PromoteClassArmStudentsDto } from './dto/promote-classarm-students.dto';
import { CreateLevelProgressionDto, UpdateLevelProgressionDto } from './dto/level-progression.dto';
import {
  StudentPromotionWithIncludes,
  PromotionResult,
  PromotionBatchResult,
  StudentPromotionPreview,
  LevelProgressionWithIncludes,
  PromotionValidationResult,
  ClassArmCapacityInfo,
  PromotionStatistics,
} from './types/promotion.types';

@Injectable()
export class StudentPromotionsService extends BaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classArmStudentService: ClassArmStudentService,
  ) {
    super(StudentPromotionsService.name);
  }

  /**
   * Create a new promotion batch for bulk student promotion
   */
  /**
   * Promotes students from a specific class arm to the next level
   * This is a simpler, more intuitive approach than bulk promotion
   */
  async promoteClassArmStudents(
    userId: string,
    dto: PromoteClassArmStudentsDto,
  ): Promise<PromotionBatchResult> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException(
        'User not associated with a school. Only school users can promote students.',
      );
    }

    // Get the source class arm
    const sourceClassArm = await this.prisma.classArm.findUnique({
      where: { id: dto.fromClassArmId },
      include: {
        level: true,
        academicSession: true,
        classArmStudents: {
          where: { isActive: true },
          include: {
            student: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!sourceClassArm) {
      throw new NotFoundException('Source class arm not found');
    }

    // Get the target academic session
    const targetSession = await this.prisma.academicSession.findUnique({
      where: { id: dto.toAcademicSessionId },
    });

    if (!targetSession) {
      throw new NotFoundException('Target academic session not found');
    }

    // Get the next level
    const nextLevel = await this.prisma.level.findFirst({
      where: {
        id: dto.toLevelId,
        schoolId: user.schoolId,
        deletedAt: null,
      },
    });

    if (!nextLevel) {
      throw new NotFoundException('Target level not found');
    }

    // Get or create the target class arm
    const targetClassArm = await this.findOrCreateClassArm(nextLevel, targetSession, {
      user: { schoolId: user.schoolId },
    });

    // Filter students based on selection
    const studentsToPromote =
      dto.studentIds && dto.studentIds.length > 0
        ? sourceClassArm.classArmStudents.filter((cas) => dto.studentIds.includes(cas.studentId))
        : sourceClassArm.classArmStudents;

    if (studentsToPromote.length === 0) {
      throw new BadRequestException('No students selected for promotion');
    }

    // Perform promotion in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const promotionResults = [];

      for (const classArmStudent of studentsToPromote) {
        const student = classArmStudent.student;

        // Deactivate current class arm enrollment
        await tx.classArmStudent.update({
          where: { id: classArmStudent.id },
          data: { isActive: false, leftAt: new Date() },
        });

        // Create new class arm enrollment
        const newClassArmStudent = await tx.classArmStudent.create({
          data: {
            studentId: student.id,
            classArmId: targetClassArm.id,
            academicSessionId: targetSession.id,
            isActive: true,
          },
        });

        // Record promotion
        await tx.studentPromotion.create({
          data: {
            studentId: student.id,
            fromClassArmId: sourceClassArm.id,
            toClassArmId: targetClassArm.id,
            fromLevelId: sourceClassArm.levelId,
            toLevelId: nextLevel.id,
            fromAcademicSessionId: sourceClassArm.academicSessionId,
            toAcademicSessionId: targetSession.id,
            promotionType: dto.promotionType === 'PROMOTE' ? 'MANUAL' : 'REPEAT',
            promotionDate: new Date(),
            promotedBy: userId,
            notes: dto.notes,
          },
        });

        promotionResults.push({
          studentId: student.id,
          studentName: `${student.user.firstName} ${student.user.lastName}`,
          fromClassArm: sourceClassArm.name,
          toClassArm: targetClassArm.name,
          fromLevel: sourceClassArm.level.name,
          toLevel: nextLevel.name,
        });
      }

      return promotionResults;
    });

    return {
      batchId: `classarm-${Date.now()}`, // Generate a unique batch ID
      totalStudents: result.length,
      successfulPromotions: result.length,
      failedPromotions: 0,
      status: 'COMPLETED' as const,
      results: result.map((r) => ({
        studentId: r.studentId,
        success: true,
        fromLevel: r.fromLevel,
        toLevel: r.toLevel,
        fromClassArm: r.fromClassArm,
        toClassArm: r.toClassArm,
      })),
      startedAt: new Date(),
      completedAt: new Date(),
    };
  }

  async createPromotionBatch(
    userId: string,
    dto: CreatePromotionBatchDto,
  ): Promise<PromotionBatchResult> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    // Get current academic session
    const currentSession = await this.getCurrentAcademicSession(user.schoolId);
    if (!currentSession) {
      throw new NotFoundException('No current academic session found');
    }

    // Validate target session
    const targetSession = await this.prisma.academicSession.findFirst({
      where: {
        id: dto.toAcademicSessionId,
        schoolId: user.schoolId,
        deletedAt: null,
      },
    });

    if (!targetSession) {
      throw new NotFoundException('Target academic session not found');
    }

    // Create promotion batch
    const batch = await this.prisma.promotionBatch.create({
      data: {
        schoolId: user.schoolId,
        fromAcademicSessionId: currentSession.id,
        toAcademicSessionId: dto.toAcademicSessionId,
        status: 'PENDING',
        totalStudents: 0,
        processedStudents: 0,
        successfulPromotions: 0,
        failedPromotions: 0,
        createdBy: userId,
      },
    });

    // Get students to promote
    const students = await this.getStudentsForPromotion(currentSession.id, dto.studentIds);

    // Update batch with total students
    await this.prisma.promotionBatch.update({
      where: { id: batch.id },
      data: { totalStudents: students.length },
    });

    return {
      batchId: batch.id,
      totalStudents: students.length,
      successfulPromotions: 0,
      failedPromotions: 0,
      status: 'PENDING',
      results: [],
    };
  }

  /**
   * Execute promotion batch
   */
  async executePromotionBatch(userId: string, batchId: string): Promise<PromotionBatchResult> {
    const batch = await this.prisma.promotionBatch.findUnique({
      where: { id: batchId },
      include: {
        fromAcademicSession: true,
        toAcademicSession: true,
      },
    });

    if (!batch) {
      throw new NotFoundException('Promotion batch not found');
    }

    if (batch.status !== 'PENDING') {
      throw new BadRequestException('Batch is not in pending status');
    }

    // Update batch status to processing
    await this.prisma.promotionBatch.update({
      where: { id: batchId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    try {
      // Get students for promotion
      const students = await this.getStudentsForPromotion(batch.fromAcademicSessionId);

      const results: PromotionResult[] = [];
      let successfulPromotions = 0;
      let failedPromotions = 0;

      // Process each student
      for (const student of students) {
        try {
          const result = await this.promoteIndividualStudent(
            student,
            batch.fromAcademicSession,
            batch.toAcademicSession,
            {
              promotionType: 'AUTOMATIC',
              createMissingClassArms: true,
              maintainGroupings: true,
            },
          );

          results.push({
            studentId: student.id,
            success: true,
            fromLevel: result.fromLevel,
            toLevel: result.toLevel,
            fromClassArm: result.fromClassArm,
            toClassArm: result.toClassArm,
          });

          successfulPromotions++;
        } catch (error) {
          results.push({
            studentId: student.id,
            success: false,
            error: error.message,
          });
          failedPromotions++;
        }

        // Update batch progress
        await this.prisma.promotionBatch.update({
          where: { id: batchId },
          data: {
            processedStudents: results.length,
            successfulPromotions,
            failedPromotions,
          },
        });
      }

      // Mark batch as completed
      await this.prisma.promotionBatch.update({
        where: { id: batchId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      return {
        batchId,
        totalStudents: students.length,
        successfulPromotions,
        failedPromotions,
        status: 'COMPLETED',
        results,
        startedAt: batch.startedAt,
        completedAt: new Date(),
      };
    } catch (error) {
      // Mark batch as failed
      await this.prisma.promotionBatch.update({
        where: { id: batchId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Promote individual student
   */
  async promoteStudent(userId: string, dto: PromoteStudentDto): Promise<PromotionResult> {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      include: {
        user: true,
        classArmStudents: {
          where: { isActive: true },
          include: {
            classArm: {
              include: {
                level: true,
                academicSession: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const targetClassArm = await this.prisma.classArm.findUnique({
      where: { id: dto.toClassArmId },
      include: {
        level: true,
        academicSession: true,
      },
    });

    if (!targetClassArm) {
      throw new NotFoundException('Target class arm not found');
    }

    // Validate promotion
    const validation = await this.validateStudentPromotion(student, targetClassArm);

    if (!validation.isValid) {
      throw new BadRequestException(`Promotion validation failed: ${validation.errors.join(', ')}`);
    }

    // Update student's class arm
    await this.prisma.student.update({
      where: { id: dto.studentId },
      data: {
        /* classArmId removed - use ClassArmStudent relationship instead */
      },
    });

    // Record promotion
    await this.prisma.studentPromotion.create({
      data: {
        studentId: dto.studentId,
        fromClassArmId: student.classArmStudents?.[0]?.classArmId || '',
        toClassArmId: dto.toClassArmId,
        fromLevelId: student.classArmStudents?.[0]?.classArm?.levelId || '',
        toLevelId: targetClassArm.levelId,
        fromAcademicSessionId: student.classArmStudents?.[0]?.classArm?.academicSessionId || '',
        toAcademicSessionId: targetClassArm.academicSessionId,
        promotionType: dto.promotionType === 'PROMOTE' ? 'MANUAL' : 'REPEAT',
        promotionDate: new Date(),
        promotedBy: userId,
        notes: dto.notes,
      },
    });

    return {
      studentId: dto.studentId,
      success: true,
      fromLevel: student.classArmStudents?.[0]?.classArm?.level?.name || 'N/A',
      toLevel: targetClassArm.level.name,
      fromClassArm: student.classArmStudents?.[0]?.classArm?.name || 'N/A',
      toClassArm: targetClassArm.name,
    };
  }

  /**
   * Get promotion preview for students
   */
  async getPromotionPreview(
    userId: string,
    fromSessionId: string,
    toSessionId: string,
  ): Promise<StudentPromotionPreview[]> {
    const students = await this.getStudentsForPromotion(fromSessionId);
    const previews: StudentPromotionPreview[] = [];

    for (const student of students) {
      const currentClassArm = await this.prisma.classArm.findUnique({
        where: { id: student.classArmStudents?.[0]?.classArmId || '' },
        include: { level: true },
      });

      if (!currentClassArm) continue;

      // Determine next level
      const nextLevel = await this.determineNextLevel(currentClassArm.level, student.user.schoolId);

      if (!nextLevel) continue;

      // Find or create appropriate class arm
      const targetClassArm = await this.findOrCreateClassArm(nextLevel, toSessionId, student);

      const warnings: string[] = [];
      const errors: string[] = [];

      // Check capacity
      if (targetClassArm) {
        const capacityInfo = await this.getClassArmCapacity(targetClassArm.id);
        if (capacityInfo.isOverCapacity) {
          warnings.push('Target class is over capacity');
        }
      }

      previews.push({
        studentId: student.id,
        studentName: `${student.user.firstName} ${student.user.lastName}`,
        studentNo: student.studentNo,
        currentLevel: currentClassArm.level.name,
        currentClassArm: currentClassArm.name,
        proposedLevel: nextLevel.name,
        proposedClassArm: targetClassArm?.name || 'To be created',
        promotionType: 'AUTOMATIC',
        canPromote: errors.length === 0,
        warnings,
        errors,
      });
    }

    return previews;
  }

  /**
   * Get student promotion history
   */
  async getStudentPromotionHistory(studentId: string): Promise<StudentPromotionWithIncludes[]> {
    return this.prisma.studentPromotion.findMany({
      where: {
        studentId,
        deletedAt: null,
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        fromClassArm: true,
        toClassArm: {
          include: {
            level: true,
          },
        },
        fromLevel: true,
        toLevel: true,
        fromAcademicSession: true,
        toAcademicSession: true,
      },
      orderBy: {
        promotionDate: 'desc',
      },
    });
  }

  /**
   * Get promotion statistics
   */
  async getPromotionStatistics(userId: string, sessionId: string): Promise<PromotionStatistics> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    const students = await this.getStudentsForPromotion(sessionId);
    const statistics: PromotionStatistics = {
      totalStudents: students.length,
      eligibleForPromotion: 0,
      requiresManualReview: 0,
      cannotPromote: 0,
      byLevel: {},
      byClassArm: {},
    };

    for (const student of students) {
      const classArm = await this.prisma.classArm.findUnique({
        where: { id: student.classArmStudents?.[0]?.classArmId || '' },
        include: { level: true },
      });

      if (!classArm) continue;

      // Count by level
      statistics.byLevel[classArm.level.name] = (statistics.byLevel[classArm.level.name] || 0) + 1;

      // Count by class arm
      statistics.byClassArm[classArm.name] = (statistics.byClassArm[classArm.name] || 0) + 1;

      // Determine eligibility
      const nextLevel = await this.determineNextLevel(classArm.level, user.schoolId);

      if (nextLevel) {
        statistics.eligibleForPromotion++;
      } else {
        statistics.cannotPromote++;
      }
    }

    return statistics;
  }

  /**
   * Get promotion batch details
   */
  async getPromotionBatch(userId: string, batchId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    return this.prisma.promotionBatch.findFirst({
      where: {
        id: batchId,
        schoolId: user.schoolId,
        deletedAt: null,
      },
      include: {
        fromAcademicSession: true,
        toAcademicSession: true,
      },
    });
  }

  /**
   * Get promotion batches for school
   */
  async getPromotionBatches(
    userId: string,
    options: { status?: string; page: number; limit: number },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    const whereClause: any = {
      schoolId: user.schoolId,
      deletedAt: null,
    };

    if (options.status) {
      whereClause.status = options.status;
    }

    const [batches, total] = await Promise.all([
      this.prisma.promotionBatch.findMany({
        where: whereClause,
        include: {
          fromAcademicSession: true,
          toAcademicSession: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.prisma.promotionBatch.count({ where: whereClause }),
    ]);

    return {
      batches,
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  /**
   * Create level progression rule
   */
  async createLevelProgression(userId: string, dto: CreateLevelProgressionDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    return this.prisma.levelProgression.create({
      data: {
        schoolId: user.schoolId,
        fromLevelId: dto.fromLevelId,
        toLevelId: dto.toLevelId,
        isAutomatic: dto.isAutomatic,
        requiresApproval: dto.requiresApproval,
        order: dto.order,
      },
      include: {
        fromLevel: true,
        toLevel: true,
      },
    });
  }

  /**
   * Get level progressions for school
   */
  async getLevelProgressions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    return this.prisma.levelProgression.findMany({
      where: {
        schoolId: user.schoolId,
        deletedAt: null,
      },
      include: {
        fromLevel: true,
        toLevel: true,
      },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Update level progression rule
   */
  async updateLevelProgression(userId: string, id: string, dto: UpdateLevelProgressionDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    const progression = await this.prisma.levelProgression.findFirst({
      where: {
        id,
        schoolId: user.schoolId,
        deletedAt: null,
      },
    });

    if (!progression) {
      throw new NotFoundException('Level progression not found');
    }

    return this.prisma.levelProgression.update({
      where: { id },
      data: dto,
      include: {
        fromLevel: true,
        toLevel: true,
      },
    });
  }

  /**
   * Delete level progression rule
   */
  async deleteLevelProgression(userId: string, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    const progression = await this.prisma.levelProgression.findFirst({
      where: {
        id,
        schoolId: user.schoolId,
        deletedAt: null,
      },
    });

    if (!progression) {
      throw new NotFoundException('Level progression not found');
    }

    return this.prisma.levelProgression.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Private helper methods

  private async getCurrentAcademicSession(schoolId: string) {
    return this.prisma.academicSession.findFirst({
      where: {
        schoolId,
        isCurrent: true,
        deletedAt: null,
      },
    });
  }

  private async getStudentsForPromotion(sessionId: string, studentIds?: string[]) {
    const whereClause: any = {
      classArmStudents: {
        some: {
          classArm: {
            academicSessionId: sessionId,
          },
        },
      },
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (studentIds && studentIds.length > 0) {
      whereClause.id = {
        in: studentIds,
      };
    }

    return this.prisma.student.findMany({
      where: whereClause,
      include: {
        user: true,
        classArmStudents: {
          where: { isActive: true },
          include: {
            classArm: {
              include: {
                level: true,
              },
            },
          },
        },
      },
    });
  }

  private async promoteIndividualStudent(
    student: any,
    fromSession: any,
    toSession: any,
    rules: any,
  ) {
    const currentClassArm = student.classArmStudents?.[0]?.classArm;
    if (!currentClassArm) {
      throw new Error('Student is not enrolled in any class arm');
    }
    const nextLevel = await this.determineNextLevel(currentClassArm.level, student.user.schoolId);

    if (!nextLevel) {
      throw new Error('Cannot determine next level');
    }

    const targetClassArm = await this.findOrCreateClassArm(nextLevel, toSession, student);

    // Deactivate current class arm enrollment
    const currentClassArmStudent = student.classArmStudents?.[0];
    if (currentClassArmStudent) {
      await this.prisma.classArmStudent.update({
        where: { id: currentClassArmStudent.id },
        data: { isActive: false, leftAt: new Date() },
      });
    }

    // Create new class arm enrollment
    await this.prisma.classArmStudent.create({
      data: {
        studentId: student.id,
        classArmId: targetClassArm.id,
        academicSessionId: toSession.id,
        isActive: true,
      },
    });

    // Record promotion
    await this.prisma.studentPromotion.create({
      data: {
        studentId: student.id, // Original student ID
        promotedStudentId: null, // No new student record created
        fromClassArmId: currentClassArm.id,
        toClassArmId: targetClassArm.id,
        fromLevelId: currentClassArm.levelId,
        toLevelId: nextLevel.id,
        fromAcademicSessionId: fromSession.id,
        toAcademicSessionId: toSession.id,
        promotionType: rules.promotionType === 'PROMOTE' ? 'MANUAL' : 'REPEAT',
        promotionDate: new Date(),
        promotedBy: 'system',
        notes: rules.notes,
      },
    });

    return {
      fromLevel: currentClassArm.level.name,
      toLevel: nextLevel.name,
      fromClassArm: currentClassArm.name,
      toClassArm: targetClassArm.name,
    };
  }

  private async determineNextLevel(currentLevel: any, schoolId: string) {
    // Check for configured progression
    const progression = await this.prisma.levelProgression.findFirst({
      where: {
        schoolId,
        fromLevelId: currentLevel.id,
        deletedAt: null,
      },
      include: {
        toLevel: true,
      },
    });

    if (progression) {
      return progression.toLevel;
    }

    // Default progression logic
    const levelOrder = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
    const currentIndex = levelOrder.indexOf(currentLevel.name);

    if (currentIndex === -1 || currentIndex === levelOrder.length - 1) {
      return null;
    }

    const nextLevelName = levelOrder[currentIndex + 1];
    return this.prisma.level.findFirst({
      where: {
        name: nextLevelName,
        schoolId,
        deletedAt: null,
      },
    });
  }

  private async findOrCreateClassArm(level: any, toSession: any, student: any) {
    // Find existing class arms in the target level and session
    const existingClassArms = await this.prisma.classArm.findMany({
      where: {
        levelId: level.id,
        academicSessionId: toSession.id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        level: {
          select: { name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (existingClassArms.length === 0) {
      throw new BadRequestException(
        `No class arms exist in ${level.name} for the ${toSession.academicYear} academic session. ` +
          `Please create a class arm in ${level.name} before promoting students.`,
      );
    }

    // For now, return the first available class arm
    // In the future, this could be enhanced to allow selection of specific class arm
    const classArm = existingClassArms[0];

    return {
      id: classArm.id,
      name: classArm.name,
      levelId: level.id,
      academicSessionId: toSession.id,
      schoolId: String(student.user.schoolId),
    };
  }

  private async validateStudentPromotion(
    student: any,
    targetClassArm: any,
  ): Promise<PromotionValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if student is active
    if (student.status !== 'ACTIVE') {
      errors.push('Student is not active');
    }

    // Check class capacity
    const capacityInfo = await this.getClassArmCapacity(targetClassArm.id);
    if (capacityInfo.isOverCapacity) {
      warnings.push('Target class is over capacity');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceed: errors.length === 0,
    };
  }

  private async getClassArmCapacity(classArmId: string): Promise<ClassArmCapacityInfo> {
    const classArm = await this.prisma.classArm.findUnique({
      where: { id: classArmId },
      include: {
        classArmStudents: {
          where: {
            isActive: true,
          },
        },
      },
    });

    if (!classArm) {
      throw new NotFoundException('Class arm not found');
    }

    const currentCapacity = classArm.classArmStudents.length;
    const maxCapacity = 30; // Default capacity, could be configurable
    const availableSlots = maxCapacity - currentCapacity;
    const isOverCapacity = currentCapacity >= maxCapacity;

    return {
      classArmId,
      className: classArm.name,
      currentCapacity,
      maxCapacity,
      availableSlots,
      isOverCapacity,
    };
  }
}
