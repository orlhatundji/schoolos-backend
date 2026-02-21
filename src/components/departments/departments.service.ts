import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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
      throw new BadRequestException('User not associated with a school');
    }

    // Check if code already exists for this school
    const existingCode = await this.prisma.department.findFirst({
      where: {
        schoolId: user.schoolId,
        code: createDepartmentDto.code,
        deletedAt: null,
      },
    });

    if (existingCode) {
      throw new BadRequestException(
        `A department with code "${createDepartmentDto.code}" already exists in your school.`
      );
    }

    // Validate HOD if provided
    if (createDepartmentDto.hodId) {
      const teacher = await this.prisma.teacher.findFirst({
        where: {
          id: createDepartmentDto.hodId,
          user: { schoolId: user.schoolId },
          deletedAt: null,
        },
      });

      if (!teacher) {
        throw new BadRequestException('Teacher not found or does not belong to this school');
      }

      // Check if teacher is already HOD of another department
      const existingHOD = await this.prisma.department.findFirst({
        where: {
          schoolId: user.schoolId,
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

    const department = await this.prisma.department.create({
      data: {
        name: createDepartmentDto.name,
        code: createDepartmentDto.code,
        school: {
          connect: { id: user.schoolId },
        },
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

    return department;
  }

  async updateDepartment(
    userId: string,
    departmentId: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ) {
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
      throw new NotFoundException('Department not found or access denied');
    }

    // Validate HOD if provided
    if (updateDepartmentDto.hodId) {
      const teacher = await this.prisma.teacher.findFirst({
        where: {
          id: updateDepartmentDto.hodId,
          user: { schoolId: user.schoolId },
          deletedAt: null,
        },
      });

      if (!teacher) {
        throw new BadRequestException('Teacher not found or does not belong to this school');
      }

      // Check if teacher is already HOD of another department (excluding current department)
      const existingHOD = await this.prisma.department.findFirst({
        where: {
          schoolId: user.schoolId,
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

    // Handle HOD update using transaction
    const department = await this.prisma.$transaction(async (tx) => {
      // If updating HOD, first delete existing HOD record if it exists
      if (updateDepartmentDto.hodId !== undefined) {
        await tx.hod.deleteMany({
          where: { departmentId },
        });
      }

      // Update department
      const updatedDepartment = await tx.department.update({
        where: { id: departmentId },
        data: {
          ...(updateDepartmentDto.name && { name: updateDepartmentDto.name }),
          ...(updateDepartmentDto.code && { code: updateDepartmentDto.code }),
          ...(updateDepartmentDto.hodId !== undefined && { hodId: updateDepartmentDto.hodId }),
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

      // If new HOD is provided, create the HOD record
      if (updateDepartmentDto.hodId) {
        await tx.hod.create({
          data: {
            teacherId: updateDepartmentDto.hodId,
            departmentId,
          },
        });
      }

      // Return the updated department with HOD data
      return await tx.department.findUnique({
        where: { id: departmentId },
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
      throw new BadRequestException('User not associated with a school');
    }

    // Verify the department belongs to the user's school
    const existingDepartment = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        schoolId: user.schoolId,
      },
    });

    if (!existingDepartment) {
      throw new NotFoundException('Department not found or access denied');
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
      throw new BadRequestException('User not associated with a school');
    }

    // Verify the department belongs to the user's school
    const existingDepartment = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        schoolId: user.schoolId,
      },
    });

    if (!existingDepartment) {
      throw new NotFoundException('Department not found or access denied');
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
      throw new BadRequestException('User not associated with a school');
    }

    // Verify the department belongs to the user's school
    const existingDepartment = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        schoolId: user.schoolId,
      },
    });

    if (!existingDepartment) {
      throw new NotFoundException('Department not found or access denied');
    }

    // Check if department has associated head of department
    const headOfDepartment = await this.prisma.teacher.findFirst({
      where: { departmentId },
    });

    if (headOfDepartment) {
      throw new BadRequestException(
        'Cannot delete department. It has associated head of department. Please reassign or remove all associated head of department first.',
      );
    }

    // Check if department has associated subjects
    const subjects = await this.prisma.subject.findFirst({
      where: { departmentId },
    });

    if (subjects) {
      throw new BadRequestException(
        'Cannot delete department. It has associated subjects. Please reassign or remove all associated subjects first.',
      );
    }

    await this.prisma.department.delete({
      where: { id: departmentId },
    });

    return { message: 'Department deleted successfully' };
  }
}
