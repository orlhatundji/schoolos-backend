import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createDepartment(userId: string, createDepartmentDto: CreateDepartmentDto) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not associated with a school');
    }

    const department = await this.prisma.department.create({
      data: {
        name: createDepartmentDto.name,
        code: createDepartmentDto.code,
        hodId: createDepartmentDto.hodId,
        school: {
          connect: { id: user.schoolId },
        },
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

    return department;
  }

  async updateDepartment(userId: string, departmentId: string, updateDepartmentDto: UpdateDepartmentDto) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not associated with a school');
    }

    // Verify the department belongs to the user's school
    const existingDepartment = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        schoolId: user.schoolId,
      },
    });

    if (!existingDepartment) {
      throw new Error('Department not found or access denied');
    }

    const department = await this.prisma.department.update({
      where: { id: departmentId },
      data: {
        ...(updateDepartmentDto.name && { name: updateDepartmentDto.name }),
        ...(updateDepartmentDto.code && { code: updateDepartmentDto.code }),
        ...(updateDepartmentDto.hodId && { hodId: updateDepartmentDto.hodId }),
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

    return department;
  }

  async archiveDepartment(userId: string, departmentId: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not associated with a school');
    }

    // Verify the department belongs to the user's school
    const existingDepartment = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        schoolId: user.schoolId,
      },
    });

    if (!existingDepartment) {
      throw new Error('Department not found or access denied');
    }

    const department = await this.prisma.department.update({
      where: { id: departmentId },
      data: { deletedAt: new Date() },
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

    return department;
  }

  async unarchiveDepartment(userId: string, departmentId: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not associated with a school');
    }

    // Verify the department belongs to the user's school
    const existingDepartment = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        schoolId: user.schoolId,
      },
    });

    if (!existingDepartment) {
      throw new Error('Department not found or access denied');
    }

    const department = await this.prisma.department.update({
      where: { id: departmentId },
      data: { deletedAt: null },
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

    return department;
  }

  async deleteDepartment(userId: string, departmentId: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not associated with a school');
    }

    // Verify the department belongs to the user's school
    const existingDepartment = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        schoolId: user.schoolId,
      },
    });

    if (!existingDepartment) {
      throw new Error('Department not found or access denied');
    }

    // Check if department has associated head of department
    const headOfDepartment = await this.prisma.teacher.findFirst({
      where: { departmentId },
    });

    if (headOfDepartment) {
      throw new Error('Cannot delete department. It has associated head of department. Please reassign or remove all associated head of department first.');
    }

    // Check if department has associated subjects
    const subjects = await this.prisma.subject.findFirst({
      where: { departmentId },
    });

    if (subjects) {
      throw new Error('Cannot delete department. It has associated subjects. Please reassign or remove all associated subjects first.');
    }

    await this.prisma.department.delete({
      where: { id: departmentId },
    });

    return { message: 'Department deleted successfully' };
  }
}
