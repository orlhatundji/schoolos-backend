import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ClassArmStudentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the current active class arm for a student in a specific academic session
   */
  async getCurrentClassArm(studentId: string, academicSessionId: string) {
    return this.prisma.classArmStudent.findFirst({
      where: {
        studentId,
        academicSessionId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        classArm: {
          include: {
            level: true,
            department: true,
          },
        },
        academicSession: true,
      },
    });
  }

  /**
   * Get all class arm enrollments for a student (historical and current)
   */
  async getStudentClassArmHistory(studentId: string) {
    return this.prisma.classArmStudent.findMany({
      where: {
        studentId,
        deletedAt: null,
      },
      include: {
        classArm: {
          include: {
            level: true,
            department: true,
          },
        },
        academicSession: true,
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    });
  }

  /**
   * Get all students in a specific class arm for a specific academic session
   */
  async getClassArmStudents(classArmId: string, academicSessionId: string) {
    return this.prisma.classArmStudent.findMany({
      where: {
        classArmId,
        academicSessionId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        student: {
          include: {
            user: true,
            guardian: {
              include: {
                user: true,
              },
            },
          },
        },
        classArm: {
          include: {
            level: true,
            department: true,
          },
        },
      },
      orderBy: {
        enrolledAt: 'asc',
      },
    });
  }

  /**
   * Enroll a student in a class arm for a specific academic session
   */
  async enrollStudent(studentId: string, classArmId: string, academicSessionId: string) {
    // Check if student is already enrolled in this class arm for this session
    const existingEnrollment = await this.prisma.classArmStudent.findFirst({
      where: {
        studentId,
        classArmId,
        academicSessionId,
        deletedAt: null,
      },
    });

    if (existingEnrollment) {
      throw new Error('Student is already enrolled in this class arm for this session');
    }

    // Deactivate any current active enrollment for this student in this session
    await this.prisma.classArmStudent.updateMany({
      where: {
        studentId,
        academicSessionId,
        isActive: true,
      },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });

    // Create new enrollment
    return this.prisma.classArmStudent.create({
      data: {
        studentId,
        classArmId,
        academicSessionId,
        isActive: true,
        enrolledAt: new Date(),
      },
      include: {
        classArm: {
          include: {
            level: true,
            department: true,
          },
        },
        academicSession: true,
      },
    });
  }

  /**
   * Transfer a student from one class arm to another within the same academic session
   */
  async transferStudent(
    studentId: string,
    fromClassArmId: string,
    toClassArmId: string,
    academicSessionId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Deactivate current enrollment
      await tx.classArmStudent.updateMany({
        where: {
          studentId,
          classArmId: fromClassArmId,
          academicSessionId,
          isActive: true,
        },
        data: {
          isActive: false,
          leftAt: new Date(),
        },
      });

      // Create new enrollment
      return tx.classArmStudent.create({
        data: {
          studentId,
          classArmId: toClassArmId,
          academicSessionId,
          isActive: true,
          enrolledAt: new Date(),
        },
        include: {
          classArm: {
            include: {
              level: true,
              department: true,
            },
          },
          academicSession: true,
        },
      });
    });
  }

  /**
   * Get students by academic session and optionally by class arm
   */
  async getStudentsBySession(
    academicSessionId: string,
    classArmId?: string,
    isActive: boolean = true,
  ) {
    return this.prisma.classArmStudent.findMany({
      where: {
        academicSessionId,
        ...(classArmId && { classArmId }),
        isActive,
        deletedAt: null,
      },
      include: {
        student: {
          include: {
            user: true,
            guardian: {
              include: {
                user: true,
              },
            },
          },
        },
        classArm: {
          include: {
            level: true,
            department: true,
          },
        },
        academicSession: true,
      },
      orderBy: {
        enrolledAt: 'asc',
      },
    });
  }

  /**
   * Copy classrooms from previous session to target session
   */
  async copyClassroomsFromPreviousSession(schoolId: string, targetSessionId: string) {
    // Get the most recent session before the target session
    const targetSession = await this.prisma.academicSession.findUnique({
      where: { id: targetSessionId },
      select: { startDate: true, schoolId: true, academicYear: true },
    });

    if (!targetSession || targetSession.schoolId !== schoolId) {
      throw new Error('Target session not found or does not belong to this school');
    }

    // Find the previous session (most recent before target)
    const previousSession = await this.prisma.academicSession.findFirst({
      where: {
        schoolId,
        startDate: {
          lt: targetSession.startDate,
        },
        deletedAt: null,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    if (!previousSession) {
      throw new Error('No previous session found to copy classrooms from');
    }

    // Get all class arms from previous session
    const previousClassArms = await this.prisma.classArm.findMany({
      where: {
        schoolId,
        academicSessionId: previousSession.id,
        deletedAt: null,
      },
      include: {
        level: true,
        department: true,
        _count: {
          select: {
            classArmStudents: true,
          },
        },
      },
    });

    if (previousClassArms.length === 0) {
      return {
        message: 'No classrooms found in previous session to copy',
        copiedClassrooms: [],
      };
    }

    // Create copies in target session
    const copiedClassArms = [];
    for (const classArm of previousClassArms) {
      const newSlug = `${classArm.level.name.toLowerCase()}-${classArm.name.toLowerCase()}-${targetSession.academicYear}`;

      const newClassArm = await this.prisma.classArm.create({
        data: {
          name: classArm.name,
          slug: newSlug,
          levelId: classArm.levelId,
          departmentId: classArm.departmentId,
          academicSessionId: targetSessionId,
          schoolId,
          location: classArm.location,
        },
        include: {
          level: true,
          department: true,
        },
      });

      copiedClassArms.push(newClassArm);
    }

    return {
      message: `Successfully copied ${copiedClassArms.length} classrooms from ${previousSession.academicYear}`,
      copiedClassrooms: copiedClassArms,
    };
  }

  /**
   * Get students from source class arm with their promotion status in target session
   */
  async getStudentsForImport(
    sourceClassArmId: string,
    targetSessionId: string,
    targetClassArmId?: string,
  ) {
    // Get source class arm details to determine source level
    const sourceClassArm = await this.prisma.classArm.findUnique({
      where: { id: sourceClassArmId },
      include: {
        level: true,
        academicSession: true,
      },
    });

    if (!sourceClassArm) {
      throw new Error('Source class arm not found');
    }

    // Get target class arm details if provided
    let targetClassArm = null;
    if (targetClassArmId) {
      targetClassArm = await this.prisma.classArm.findUnique({
        where: { id: targetClassArmId },
        include: {
          level: true,
        },
      });
    }

    // Get all students from source class arm
    const sourceStudents = await this.prisma.classArmStudent.findMany({
      where: {
        classArmId: sourceClassArmId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        classArm: {
          include: {
            level: true,
          },
        },
        academicSession: true,
      },
    });

    // Check which students are already enrolled in target session
    const studentIds = sourceStudents.map((s) => s.studentId);
    const existingEnrollments = await this.prisma.classArmStudent.findMany({
      where: {
        studentId: { in: studentIds },
        academicSessionId: targetSessionId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        classArm: {
          include: {
            level: true,
          },
        },
      },
    });

    // Create a map of student ID to their current enrollment in target session
    const enrollmentMap = new Map();
    existingEnrollments.forEach((enrollment) => {
      enrollmentMap.set(enrollment.studentId, enrollment);
    });

    // Determine if this is same-session reassignment or cross-session promotion
    const isSameSession = sourceClassArm.academicSessionId === targetSessionId;
    const isSameLevel = targetClassArm ? sourceClassArm.levelId === targetClassArm.levelId : false;

    // Transform data to include promotion status
    return sourceStudents.map((sourceStudent) => {
      const currentEnrollment = enrollmentMap.get(sourceStudent.studentId);

      // For same-session reassignments, only mark as "already promoted" if:
      // 1. Student is already in the target class arm, OR
      // 2. Student is in a different level (promotion within same session)
      let isAlreadyPromoted = false;
      if (currentEnrollment) {
        if (isSameSession && isSameLevel) {
          // Same session, same level: only mark as promoted if already in target class arm
          isAlreadyPromoted = targetClassArmId
            ? currentEnrollment.classArmId === targetClassArmId
            : false;
        } else if (isSameSession && !isSameLevel) {
          // Same session, different level: any enrollment means already promoted
          isAlreadyPromoted = true;
        } else {
          // Different session: any enrollment means already promoted
          isAlreadyPromoted = true;
        }
      }

      return {
        id: sourceStudent.student.id,
        firstName: sourceStudent.student.user.firstName,
        lastName: sourceStudent.student.user.lastName,
        studentNo: sourceStudent.student.studentNo,
        isAlreadyPromoted,
        currentTargetClassArm: currentEnrollment
          ? {
              id: currentEnrollment.classArm.id,
              name: currentEnrollment.classArm.name,
              levelName: currentEnrollment.classArm.level.name,
            }
          : null,
        sourceClassArm: {
          id: sourceStudent.classArm.id,
          name: sourceStudent.classArm.name,
          levelName: sourceStudent.classArm.level.name,
          sessionYear: sourceStudent.academicSession.academicYear,
        },
      };
    });
  }

  /**
   * Import selected students to target class arm
   */
  async importStudentsToClassArm(dto: {
    targetClassArmId: string;
    studentIds: string[];
    sourceClassArmId?: string;
  }) {
    const { targetClassArmId, studentIds } = dto;

    // Validate target class arm exists
    const targetClassArm = await this.prisma.classArm.findUnique({
      where: { id: targetClassArmId },
      include: {
        academicSession: true,
      },
    });

    if (!targetClassArm) {
      throw new Error('Target class arm not found');
    }

    // Check for existing enrollments in target session
    const existingEnrollments = await this.prisma.classArmStudent.findMany({
      where: {
        studentId: { in: studentIds },
        academicSessionId: targetClassArm.academicSessionId,
        isActive: true,
        deletedAt: null,
      },
    });

    const alreadyEnrolledStudentIds = existingEnrollments.map((e) => e.studentId);
    const availableStudentIds = studentIds.filter((id) => !alreadyEnrolledStudentIds.includes(id));

    if (availableStudentIds.length === 0) {
      return {
        success: false,
        message: 'All selected students are already enrolled in this session',
        importedCount: 0,
        skippedCount: studentIds.length,
        skippedStudents: studentIds,
      };
    }

    // Create enrollments in transaction
    const results = await this.prisma.$transaction(async (tx) => {
      const enrollments = [];

      for (const studentId of availableStudentIds) {
        const enrollment = await tx.classArmStudent.create({
          data: {
            studentId,
            classArmId: targetClassArmId,
            academicSessionId: targetClassArm.academicSessionId,
            isActive: true,
            enrolledAt: new Date(),
          },
        });
        enrollments.push(enrollment);
      }

      return enrollments;
    });

    return {
      success: true,
      message: `Successfully imported ${results.length} students`,
      importedCount: results.length,
      skippedCount: alreadyEnrolledStudentIds.length,
      skippedStudents: alreadyEnrolledStudentIds,
    };
  }
}
