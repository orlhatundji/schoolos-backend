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
  async enrollStudent(
    studentId: string,
    classArmId: string,
    academicSessionId: string,
  ) {
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
}
