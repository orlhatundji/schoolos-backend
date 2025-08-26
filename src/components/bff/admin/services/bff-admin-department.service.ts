import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../../prisma';
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { DepartmentsViewData } from '../types';

@Injectable()
export class BffAdminDepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  async getDepartmentsViewData(userId: string): Promise<DepartmentsViewData> {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Get all departments for the school with their related data
    const departments = await this.prisma.department.findMany({
      where: { schoolId },
      include: {
        hod: {
          include: {
            teacher: {
              include: {
                user: true,
              },
            },
          },
        },
        subjects: {
          where: { deletedAt: null },
        },
        classArms: true,
        teachers: true,
      },
    });

    // Calculate statistics
    const totalDepartments = departments.length;
    const activeDepartments = departments.filter((dept) => !dept.deletedAt).length;
    const archivedDepartments = totalDepartments - activeDepartments;
    const departmentsWithHOD = departments.filter((dept) => dept.hodId).length;
    const departmentsWithoutHOD = totalDepartments - departmentsWithHOD;

    // Process department data for the list
    const departmentsData = departments.map((department) => {
      const subjectsCount = department.subjects.length;
      const classesCount = department.classArms.length;
      const teachersCount = department.teachers.length;
      const status: 'active' | 'archived' = department.deletedAt ? 'archived' : 'active';

      return {
        id: department.id,
        name: department.name,
        code: department.code,
        hodName: department.hod?.teacher?.user
          ? `${department.hod.teacher.user.firstName} ${department.hod.teacher.user.lastName}`
          : null,
        hodId: department.hodId,
        subjectsCount,
        classesCount,
        teachersCount,
        status,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
      };
    });

    return {
      stats: {
        totalDepartments,
        activeDepartments,
        archivedDepartments,
        departmentsWithHOD,
        departmentsWithoutHOD,
      },
      departments: departmentsData,
    };
  }

  async createDepartment(userId: string, createDepartmentDto: CreateDepartmentDto) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if department with same name already exists in the school
    const existingDepartment = await this.prisma.department.findFirst({
      where: {
        schoolId,
        name: {
          equals: createDepartmentDto.name,
          mode: 'insensitive', // Case-insensitive comparison
        },
        deletedAt: null,
      },
    });

    if (existingDepartment) {
      throw new ConflictException(
        `Department with name '${createDepartmentDto.name}' already exists`,
      );
    }

    // Check if department with same code already exists
    const existingCode = await this.prisma.department.findFirst({
      where: {
        code: {
          equals: createDepartmentDto.code,
          mode: 'insensitive', // Case-insensitive comparison
        },
        deletedAt: null,
      },
    });

    if (existingCode) {
      throw new ConflictException(
        `Department with code '${createDepartmentDto.code}' already exists`,
      );
    }

    // Validate HOD if provided
    if (createDepartmentDto.hodId) {
      const teacher = await this.prisma.teacher.findFirst({
        where: {
          id: createDepartmentDto.hodId,
          user: { schoolId },
          deletedAt: null,
        },
      });

      if (!teacher) {
        throw new BadRequestException('Teacher not found or does not belong to this school');
      }

      // Check if teacher is already HOD of another department
      const existingHOD = await this.prisma.department.findFirst({
        where: {
          schoolId,
          hodId: createDepartmentDto.hodId,
          deletedAt: null,
        },
      });

      if (existingHOD) {
        throw new BadRequestException(
          'Teacher is already Head of Department for another department',
        );
      }
    }

    // Create the department
    const department = await this.prisma.department.create({
      data: {
        name: createDepartmentDto.name,
        code: createDepartmentDto.code.toUpperCase(),
        schoolId,
        hodId: createDepartmentDto.hodId || null,
        ...(createDepartmentDto.hodId && {
          hod: {
            create: {
              teacherId: createDepartmentDto.hodId,
            },
          },
        }),
      },
      include: {
        hod: {
          include: {
            teacher: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    return {
      id: department.id,
      name: department.name,
      code: department.code,
      hodName: department.hod?.teacher?.user
        ? `${department.hod.teacher.user.firstName} ${department.hod.teacher.user.lastName}`
        : null,
      hodId: department.hodId,
      schoolId: department.schoolId,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
    };
  }

  async updateDepartment(
    userId: string,
    departmentId: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if department exists and belongs to the school
    const existingDepartment = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        schoolId,
      },
    });

    if (!existingDepartment) {
      throw new NotFoundException('Department not found');
    }

    // Check for name conflict if name is being updated
    if (updateDepartmentDto.name && updateDepartmentDto.name !== existingDepartment.name) {
      const nameConflict = await this.prisma.department.findFirst({
        where: {
          schoolId,
          name: {
            equals: updateDepartmentDto.name,
            mode: 'insensitive',
          },
          id: { not: departmentId },
          deletedAt: null,
        },
      });

      if (nameConflict) {
        throw new ConflictException(
          `Department with name '${updateDepartmentDto.name}' already exists`,
        );
      }
    }

    // Check for code conflict if code is being updated
    if (updateDepartmentDto.code && updateDepartmentDto.code !== existingDepartment.code) {
      const codeConflict = await this.prisma.department.findFirst({
        where: {
          code: {
            equals: updateDepartmentDto.code,
            mode: 'insensitive',
          },
          id: { not: departmentId },
          deletedAt: null,
        },
      });

      if (codeConflict) {
        throw new ConflictException(
          `Department with code '${updateDepartmentDto.code}' already exists`,
        );
      }
    }

    // Validate HOD if provided
    if (updateDepartmentDto.hodId) {
      const teacher = await this.prisma.teacher.findFirst({
        where: {
          id: updateDepartmentDto.hodId,
          user: { schoolId },
          deletedAt: null,
        },
      });

      if (!teacher) {
        throw new BadRequestException('Teacher not found or does not belong to this school');
      }

      // Check if teacher is already HOD of another department (excluding current department)
      const existingHOD = await this.prisma.department.findFirst({
        where: {
          schoolId,
          hodId: updateDepartmentDto.hodId,
          id: { not: departmentId },
          deletedAt: null,
        },
      });

      if (existingHOD) {
        throw new BadRequestException(
          'Teacher is already Head of Department for another department',
        );
      }
    }

    // Update the department
    const updatedDepartment = await this.prisma.department.update({
      where: { id: departmentId },
      data: {
        ...(updateDepartmentDto.name && { name: updateDepartmentDto.name }),
        ...(updateDepartmentDto.code && { code: updateDepartmentDto.code.toUpperCase() }),
        ...(updateDepartmentDto.hodId !== undefined && { hodId: updateDepartmentDto.hodId }),
        ...(updateDepartmentDto.hodId && {
          hod: {
            upsert: {
              create: {
                teacherId: updateDepartmentDto.hodId,
              },
              update: {
                teacherId: updateDepartmentDto.hodId,
              },
            },
          },
        }),
        ...(updateDepartmentDto.hodId === null && {
          hod: {
            delete: true,
          },
        }),
      },
      include: {
        hod: {
          include: {
            teacher: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    return {
      id: updatedDepartment.id,
      name: updatedDepartment.name,
      code: updatedDepartment.code,
      hodName: updatedDepartment.hod?.teacher?.user
        ? `${updatedDepartment.hod.teacher.user.firstName} ${updatedDepartment.hod.teacher.user.lastName}`
        : null,
      hodId: updatedDepartment.hodId,
      schoolId: updatedDepartment.schoolId,
      createdAt: updatedDepartment.createdAt,
      updatedAt: updatedDepartment.updatedAt,
    };
  }

  async archiveDepartment(userId: string, departmentId: string) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if department exists and belongs to the school
    const department = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        schoolId,
        deletedAt: null, // Only active departments can be archived
      },
      include: {
        subjects: {
          where: { deletedAt: null },
        },
        classArms: true,
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found or already archived');
    }

    // Check if department has associated subjects or classes
    const hasSubjects = department.subjects.length > 0;
    const hasClasses = department.classArms.length > 0;

    if (hasSubjects || hasClasses) {
      const reasons = [];
      if (hasSubjects) reasons.push('subjects');
      if (hasClasses) reasons.push('classes');

      throw new BadRequestException(
        `Cannot archive department. It has associated ${reasons.join(' and ')}. Please reassign or remove all associated ${reasons.join(' and ')} first.`,
      );
    }

    // Archive the department (soft delete)
    await this.prisma.department.update({
      where: { id: departmentId },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Department archived successfully',
      id: departmentId,
    };
  }

  async unarchiveDepartment(userId: string, departmentId: string) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if department exists and belongs to the school
    const department = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        schoolId,
        deletedAt: { not: null }, // Only archived departments can be unarchived
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found or not archived');
    }

    // Unarchive the department
    await this.prisma.department.update({
      where: { id: departmentId },
      data: {
        deletedAt: null,
      },
    });

    return {
      success: true,
      message: 'Department unarchived successfully',
      id: departmentId,
    };
  }

  async deleteDepartment(userId: string, departmentId: string) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Check if department exists and belongs to the school
    const department = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        schoolId,
      },
      include: {
        subjects: {
          where: { deletedAt: null },
        },
        classArms: {
          where: { deletedAt: null },
        },
        teachers: {
          where: { deletedAt: null },
        },
        hod: true,
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Check if department has associated records
    const hasSubjects = department.subjects.length > 0;
    const hasClassArms = department.classArms.length > 0;
    const hasTeachers = department.teachers.length > 0;
    const hasHOD = !!department.hod;

    if (hasSubjects || hasClassArms || hasTeachers || hasHOD) {
      const reasons = [];
      if (hasSubjects) reasons.push('subjects');
      if (hasClassArms) reasons.push('class arms');
      if (hasTeachers) reasons.push('teachers');
      if (hasHOD) reasons.push('head of department');

      throw new BadRequestException(
        `Cannot delete department. It has associated ${reasons.join(', ')}. Please reassign or remove all associated ${reasons.join(', ')} first.`,
      );
    }

    // Permanently delete the department
    await this.prisma.department.delete({
      where: { id: departmentId },
    });

    return {
      success: true,
      message: 'Department deleted successfully',
      id: departmentId,
    };
  }
}
