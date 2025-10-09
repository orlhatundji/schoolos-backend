import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseService } from '../../common/base-service';
import { ClassArmStudentService } from '../students/services/class-arm-student.service';
import { PromoteStudentDto } from './dto/promote-student.dto';
import { PromoteClassArmStudentsDto } from './dto/promote-classarm-students.dto';
import { CreateLevelProgressionDto, UpdateLevelProgressionDto } from './dto/level-progression.dto';
import {
  StudentPromotionWithIncludes,
  PromotionResult,
  PromotionBatchResult,
  LevelProgressionWithIncludes,
  PromotionValidationResult,
  ClassArmCapacityInfo,
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
    // Validate UUID fields only if they are provided and not empty
    if (dto.existingTargetClassArmId && dto.existingTargetClassArmId.trim() !== '') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(dto.existingTargetClassArmId)) {
        throw new BadRequestException('existingTargetClassArmId must be a valid UUID');
      }
    }

    if (dto.repeatersClassArmId && dto.repeatersClassArmId.trim() !== '') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(dto.repeatersClassArmId)) {
        throw new BadRequestException('repeatersClassArmId must be a valid UUID');
      }
    }

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

    // Filter students based on selection
    const allStudents =
      dto.studentIds && dto.studentIds.length > 0
        ? sourceClassArm.classArmStudents.filter((cas) => dto.studentIds.includes(cas.studentId))
        : sourceClassArm.classArmStudents;

    if (allStudents.length === 0) {
      throw new BadRequestException('No students selected for promotion');
    }

    // For now, all students will be promoted based on the DTO promotion type
    // In the future, this could be enhanced to allow individual student promotion types
    const promotedStudents = dto.promotionType === 'PROMOTE' ? allStudents : [];
    const repeaterStudents = dto.promotionType === 'REPEAT' ? allStudents : [];

    // Get or create the target class arm for promoted students
    const targetClassArm = await this.findOrCreateClassArm(nextLevel, targetSession, sourceClassArm, dto);

    // Get or create repeaters class arm if there are repeaters
    let repeatersClassArm = null;
    if (repeaterStudents.length > 0) {
      if (dto.repeatersClassArmId) {
        // Use existing repeaters class arm
        repeatersClassArm = await this.prisma.classArm.findFirst({
          where: {
            id: dto.repeatersClassArmId,
            levelId: sourceClassArm.levelId, // Same level as source
            academicSessionId: targetSession.id,
            deletedAt: null,
          },
        });

        if (!repeatersClassArm) {
          throw new BadRequestException('Specified repeaters class arm not found or invalid');
        }
      } else {
        // Create new repeaters class arm
        const repeatersName = dto.repeatersClassArmName || `${sourceClassArm.name}-Repeaters`;
        
        repeatersClassArm = await this.prisma.classArm.create({
          data: {
            name: repeatersName,
            slug: `${repeatersName.toLowerCase()}-${sourceClassArm.level.name.toLowerCase()}-${targetSession.academicYear}`,
            levelId: sourceClassArm.levelId, // Same level as source
            academicSessionId: targetSession.id,
            schoolId: sourceClassArm.schoolId,
            classTeacherId: sourceClassArm.classTeacherId, // Inherit class teacher
            location: sourceClassArm.location, // Inherit location
          },
        });
      }
    }

    // Perform promotion in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const promotionResults = [];

      // Process promoted students
      for (const classArmStudent of promotedStudents) {
        const student = classArmStudent.student;

        // Deactivate current class arm enrollment
        await tx.classArmStudent.update({
          where: { id: classArmStudent.id },
          data: { isActive: false, leftAt: new Date() },
        });

        // Create new class arm enrollment
        await tx.classArmStudent.create({
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
            promotionType: 'MANUAL',
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

      // Process repeater students
      for (const classArmStudent of repeaterStudents) {
        const student = classArmStudent.student;

        // Deactivate current class arm enrollment
        await tx.classArmStudent.update({
          where: { id: classArmStudent.id },
          data: { isActive: false, leftAt: new Date() },
        });

        // Create new class arm enrollment for repeaters
        await tx.classArmStudent.create({
          data: {
            studentId: student.id,
            classArmId: repeatersClassArm.id,
            academicSessionId: targetSession.id,
            isActive: true,
          },
        });

        // Record promotion (repeaters stay in same level)
        await tx.studentPromotion.create({
          data: {
            studentId: student.id,
            fromClassArmId: sourceClassArm.id,
            toClassArmId: repeatersClassArm.id,
            fromLevelId: sourceClassArm.levelId,
            toLevelId: sourceClassArm.levelId, // Same level
            fromAcademicSessionId: sourceClassArm.academicSessionId,
            toAcademicSessionId: targetSession.id,
            promotionType: 'REPEAT',
            promotionDate: new Date(),
            promotedBy: userId,
            notes: dto.notes,
          },
        });

        promotionResults.push({
          studentId: student.id,
          studentName: `${student.user.firstName} ${student.user.lastName}`,
          fromClassArm: sourceClassArm.name,
          toClassArm: repeatersClassArm.name,
          fromLevel: sourceClassArm.level.name,
          toLevel: sourceClassArm.level.name, // Same level
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

  private async findOrCreateClassArm(
    level: any, 
    toSession: any, 
    sourceClassArm: any, 
    dto: any
  ) {
    // If using existing class arm, find and return it
    if (dto.useExistingClassArm && dto.existingTargetClassArmId) {
      const existingClassArm = await this.prisma.classArm.findFirst({
        where: {
          id: dto.existingTargetClassArmId,
          levelId: level.id,
          academicSessionId: toSession.id,
          deletedAt: null,
        },
      });

      if (!existingClassArm) {
        throw new BadRequestException('Specified target class arm not found or invalid');
      }

      return {
        id: existingClassArm.id,
        name: existingClassArm.name,
        levelId: level.id,
        academicSessionId: toSession.id,
        schoolId: existingClassArm.schoolId,
      };
    }

    // Create new class arm with preserved name
    const targetClassArmName = dto.targetClassArmName || sourceClassArm.name;
    
    // Check if class arm with same name already exists in target level/session
    const existingClassArm = await this.prisma.classArm.findFirst({
      where: {
        name: targetClassArmName,
        levelId: level.id,
        academicSessionId: toSession.id,
        deletedAt: null,
      },
    });

    if (existingClassArm) {
      throw new BadRequestException(
        `Class arm '${targetClassArmName}' already exists in ${level.name} for ${toSession.academicYear}`
      );
    }

    // Create new class arm
    const newClassArm = await this.prisma.classArm.create({
      data: {
        name: targetClassArmName,
        slug: `${targetClassArmName.toLowerCase()}-${level.name.toLowerCase()}-${toSession.academicYear}`,
        levelId: level.id,
        academicSessionId: toSession.id,
        schoolId: sourceClassArm.schoolId,
        classTeacherId: sourceClassArm.classTeacherId, // Inherit class teacher
        location: sourceClassArm.location, // Inherit location
      },
    });

    return {
      id: newClassArm.id,
      name: newClassArm.name,
      levelId: level.id,
      academicSessionId: toSession.id,
      schoolId: newClassArm.schoolId,
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
