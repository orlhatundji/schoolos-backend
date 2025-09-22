import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../../prisma';
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { UpdateSubjectDto } from '../dto/update-subject.dto';
import { SubjectsViewData } from '../types';

@Injectable()
export class BffAdminSubjectService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubjectsViewData(userId: string): Promise<SubjectsViewData> {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Get current academic session
    const currentSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
    });

    if (!currentSession) {
      throw new Error('No current academic session found');
    }

    // Get all subjects for the school with their related data (filtered by current session)
    const subjects = await this.prisma.subject.findMany({
      where: {
        schoolId,
        deletedAt: null, // Only active subjects
      },
      include: {
        department: true,
        classArmSubjectTeachers: {
          where: {
            deletedAt: null,
            classArm: {
              academicSessionId: currentSession.id,
              deletedAt: null,
            },
          },
          include: {
            classArm: {
              include: {
                students: {
                  where: {
                    deletedAt: null,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Calculate statistics
    const totalSubjects = subjects.length;

    // Calculate category breakdown using the new category field
    const coreSubjects = subjects.filter((subject) => subject.category === 'CORE').length;
    const generalSubjects = subjects.filter((subject) => subject.category === 'GENERAL').length;
    const vocationalSubjects = subjects.filter(
      (subject) => subject.category === 'VOCATIONAL',
    ).length;

    const categoryBreakdown = {
      core: coreSubjects,
      general: generalSubjects,
      vocational: vocationalSubjects,
    };

    // Calculate department breakdown
    const departmentBreakdown: { [key: string]: number } = {};
    subjects.forEach((subject) => {
      const departmentName = subject.department?.name || 'Unassigned';
      departmentBreakdown[departmentName] = (departmentBreakdown[departmentName] || 0) + 1;
    });

    // Process subject data for the list
    const subjectsData = subjects.map((subject) => {
      // Calculate classes count (unique class arms teaching this subject)
      const uniqueClasses = new Set(subject.classArmSubjectTeachers.map((cast) => cast.classArmId));
      const classesCount = uniqueClasses.size;

      // Calculate student count (total students in all classes taking this subject)
      const studentCount = subject.classArmSubjectTeachers.reduce(
        (total, cast) => total + cast.classArm.students.length,
        0,
      );

      // Determine status (active if not deleted)
      const status: 'active' | 'inactive' = subject.deletedAt ? 'inactive' : 'active';

      return {
        id: subject.id,
        name: subject.name,
        department: subject.department?.name || null,
        category: subject.category,
        classesCount,
        studentCount,
        status,
      };
    });

    return {
      stats: {
        totalSubjects,
        categoryBreakdown,
        departmentBreakdown,
      },
      subjects: subjectsData,
    };
  }

  async createSubject(userId: string, createSubjectDto: CreateSubjectDto) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if subject with same name already exists in the school
    const existingSubject = await this.prisma.subject.findFirst({
      where: {
        schoolId,
        name: {
          equals: createSubjectDto.name,
          mode: 'insensitive', // Case-insensitive comparison
        },
        deletedAt: null,
      },
    });

    if (existingSubject) {
      throw new ConflictException(`Subject with name '${createSubjectDto.name}' already exists`);
    }

    // Validate department if provided
    if (createSubjectDto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: createSubjectDto.departmentId,
          schoolId,
          deletedAt: null,
        },
      });

      if (!department) {
        throw new BadRequestException('Department not found or does not belong to this school');
      }
    }

    // Create the subject
    const subject = await this.prisma.subject.create({
      data: {
        name: createSubjectDto.name,
        category: createSubjectDto.category || 'CORE',
        schoolId,
        departmentId: createSubjectDto.departmentId || null,
      },
      include: {
        department: true,
      },
    });

    return {
      id: subject.id,
      name: subject.name,
      category: subject.category,
      department: subject.department?.name || null,
      departmentId: subject.departmentId,
      schoolId: subject.schoolId,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    };
  }

  async updateSubject(userId: string, subjectId: string, updateSubjectDto: UpdateSubjectDto) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if subject exists and belongs to the school
    const existingSubject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        schoolId,
        deletedAt: null,
      },
    });

    if (!existingSubject) {
      throw new NotFoundException('Subject not found');
    }

    // Check for name conflict if name is being updated
    if (updateSubjectDto.name && updateSubjectDto.name !== existingSubject.name) {
      const nameConflict = await this.prisma.subject.findFirst({
        where: {
          schoolId,
          name: {
            equals: updateSubjectDto.name,
            mode: 'insensitive',
          },
          id: { not: subjectId },
          deletedAt: null,
        },
      });

      if (nameConflict) {
        throw new ConflictException(`Subject with name '${updateSubjectDto.name}' already exists`);
      }
    }

    // Validate department if provided
    if (updateSubjectDto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: updateSubjectDto.departmentId,
          schoolId,
          deletedAt: null,
        },
      });

      if (!department) {
        throw new BadRequestException('Department not found or does not belong to this school');
      }
    }

    // Update the subject
    const updatedSubject = await this.prisma.subject.update({
      where: { id: subjectId },
      data: {
        ...(updateSubjectDto.name && { name: updateSubjectDto.name }),
        ...(updateSubjectDto.category && { category: updateSubjectDto.category }),
        ...(updateSubjectDto.departmentId !== undefined && {
          departmentId: updateSubjectDto.departmentId,
        }),
      },
      include: {
        department: true,
      },
    });

    return {
      id: updatedSubject.id,
      name: updatedSubject.name,
      category: updatedSubject.category,
      department: updatedSubject.department?.name || null,
      departmentId: updatedSubject.departmentId,
      schoolId: updatedSubject.schoolId,
      createdAt: updatedSubject.createdAt,
      updatedAt: updatedSubject.updatedAt,
    };
  }

  async deleteSubject(userId: string, subjectId: string) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if subject exists and belongs to the school
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        schoolId,
        deletedAt: null,
      },
      include: {
        subjectTerms: {
          include: {
            subjectTermStudents: {
              include: {
                assessments: true,
              },
            },
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // Check if subject has any assessments
    const hasAssessments = subject.subjectTerms.some((subjectTerm) =>
      subjectTerm.subjectTermStudents.some((student) => student.assessments.length > 0),
    );

    if (hasAssessments) {
      throw new BadRequestException(
        'Cannot delete subject. It has associated assessments. Please remove all assessments first.',
      );
    }

    // Soft delete the subject
    await this.prisma.subject.update({
      where: { id: subjectId },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Subject deleted successfully',
      id: subjectId,
    };
  }
}
