import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { PrismaService } from '../../prisma';
import { PasswordHasher } from '../../utils/hasher';
import { CreateTeacherDto, QueryTeachersDto, UpdateTeacherDto } from './dto';
import {
  TeacherDetailsResult,
  TeacherListResult,
  TeacherResult,
  TeacherStatsResult,
} from './results';

@Injectable()
export class AdminTeacherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async createTeacher(userId: string, createTeacherDto: CreateTeacherDto): Promise<TeacherResult> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    // Check if manually provided teacher ID already exists globally
    if (createTeacherDto.teacherId) {
      const existingTeacherId = await this.prisma.teacher.findFirst({
        where: {
          teacherNo: createTeacherDto.teacherId,
          deletedAt: null,
        },
      });

      if (existingTeacherId) {
        throw new ConflictException('Teacher ID is already in use');
      }
    }

    // Generate teacher number if not provided
    const teacherNo = createTeacherDto.teacherId || (await this.generateTeacherNumber());

    // Check for email/phone conflicts within the school scope
    if (createTeacherDto.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: {
          email: createTeacherDto.email,
          schoolId: user.schoolId,
          deletedAt: null,
        },
      });

      if (existingEmail) {
        throw new ConflictException('Email address is already in use in this school');
      }
    }

    if (createTeacherDto.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: {
          phone: createTeacherDto.phone,
          schoolId: user.schoolId,
          deletedAt: null,
        },
      });

      if (existingPhone) {
        throw new ConflictException('Phone number is already in use in this school');
      }
    }

    // Hash password
    const hashedPassword = await this.passwordHasher.hash(createTeacherDto.password);

    // Create user and teacher in a transaction
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Create user
        const newUser = await tx.user.create({
          data: {
            type: 'TEACHER',
            email: createTeacherDto.email,
            phone: createTeacherDto.phone,
            password: hashedPassword,
            firstName: createTeacherDto.firstName,
            lastName: createTeacherDto.lastName,
            gender: createTeacherDto.gender,
            stateOfOrigin: createTeacherDto.stateOfOrigin,
            addressId: createTeacherDto.addressId,
            avatarUrl: createTeacherDto.avatarUrl,
            dateOfBirth: createTeacherDto.dateOfBirth
              ? new Date(createTeacherDto.dateOfBirth)
              : null,
            schoolId: user.schoolId,
          },
        });

        // Create teacher
        const teacher = await tx.teacher.create({
          data: {
            userId: newUser.id,
            teacherNo,
            departmentId: createTeacherDto.departmentId,
            status: createTeacherDto.status || 'ACTIVE',
            employmentType: createTeacherDto.employmentType || 'FULL_TIME',
            qualification: createTeacherDto.qualification,
            joinDate: createTeacherDto.joinDate ? new Date(createTeacherDto.joinDate) : new Date(),
          },
        });

        // Assign subjects if provided
        if (createTeacherDto.subjectIds && createTeacherDto.subjectIds.length > 0) {
          // Validate that all subjects exist and belong to the school
          const subjects = await tx.subject.findMany({
            where: {
              id: { in: createTeacherDto.subjectIds },
              schoolId: user.schoolId,
            },
          });

          if (subjects.length !== createTeacherDto.subjectIds.length) {
            throw new Error('One or more subjects not found or do not belong to this school');
          }

          // Get class arms for the school
          const classArms = await tx.classArm.findMany({
            where: { schoolId: user.schoolId },
          });

          if (classArms.length === 0) {
            throw new Error('No class arms found for this school');
          }

          // Create subject assignments for each class arm
          for (const classArm of classArms) {
            for (const subjectId of createTeacherDto.subjectIds) {
              await tx.classArmSubjectTeacher.create({
                data: {
                  classArmId: classArm.id,
                  subjectId,
                  teacherId: teacher.id,
                },
              });
            }
          }
        }

        // Assign as class teacher if provided
        if (createTeacherDto.classArmId) {
          // Validate that the class arm exists and belongs to the school
          const classArm = await tx.classArm.findFirst({
            where: {
              id: createTeacherDto.classArmId,
              schoolId: user.schoolId,
            },
          });

          if (!classArm) {
            throw new Error('Class arm not found or does not belong to this school');
          }

          await tx.classArm.update({
            where: { id: createTeacherDto.classArmId },
            data: { classTeacherId: teacher.id },
          });
        }

        // Return teacher with all related data
        return tx.teacher.findUnique({
          where: { id: teacher.id },
          include: {
            user: true,
            department: true,
            classArmSubjectTeachers: {
              include: { subject: true },
            },
            classArmTeachers: {
              include: { classArm: true },
            },
            classArmsAsTeacher: true,
          },
        });
      });

      return this.mapTeacherToResult(result);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[];
          if (target && target.length >= 2) {
            if (target.includes('email') && target.includes('schoolId')) {
              throw new ConflictException('Email address is already in use in this school');
            } else if (target.includes('phone') && target.includes('schoolId')) {
              throw new ConflictException('Phone number is already in use in this school');
            } else if (target.includes('teacherNo')) {
              throw new ConflictException('Teacher ID is already in use');
            }
          } else {
            // Fallback for other unique constraint violations
            const field = target?.[0];
            if (field === 'email') {
              throw new ConflictException('Email address is already in use in this school');
            } else if (field === 'phone') {
              throw new ConflictException('Phone number is already in use in this school');
            } else if (field === 'teacherNo') {
              throw new ConflictException('Teacher ID is already in use');
            }
          }
        }
      }
      throw error;
    }
  }

  async getTeachers(userId: string, queryDto: QueryTeachersDto): Promise<TeacherListResult> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not found or not associated with a school');
    }

    const { page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    // Get total count
    const totalRecords = await this.prisma.teacher.count({
      where: {
        user: { schoolId: user.schoolId, deletedAt: null },
        deletedAt: null,
      },
    });

    // Get teachers with pagination
    const teachers = await this.prisma.teacher.findMany({
      where: {
        user: { schoolId: user.schoolId, deletedAt: null },
        deletedAt: null,
      },
      skip,
      take: limit,
      include: {
        user: true,
        department: true,
        classArmSubjectTeachers: {
          include: { subject: true },
        },
        classArmTeachers: {
          include: { classArm: true },
        },
        classArmsAsTeacher: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to result format
    const teacherResults = teachers.map((teacher) => this.mapTeacherToResult(teacher));

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      teachers: teacherResults,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
    };
  }

  async getTeacherById(userId: string, teacherId: string): Promise<TeacherDetailsResult> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not found or not associated with a school');
    }

    const teacher = await this.prisma.teacher.findFirst({
      where: {
        id: teacherId,
        user: { schoolId: user.schoolId, deletedAt: null },
        deletedAt: null,
      },
      include: {
        user: {
          include: { address: true },
        },
        department: true,
        classArmSubjectTeachers: {
          include: { subject: true },
        },
        classArmTeachers: {
          include: { classArm: true },
        },
        classArmsAsTeacher: true,
      },
    });

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    const teacherResult = this.mapTeacherToResult(teacher);

    return {
      teacher: teacherResult,
      address: teacher.user.address
        ? {
            street1: teacher.user.address.street1,
            street2: teacher.user.address.street2,
            city: teacher.user.address.city,
            state: teacher.user.address.state,
            country: teacher.user.address.country,
          }
        : undefined,
      dateOfBirth: teacher.user.dateOfBirth?.toISOString().split('T')[0],
      isHOD: false, // TODO: Implement HOD check
      hodDepartment: null,
      totalStudents: 0, // TODO: Calculate from assigned classes
      averageClassSize: 0,
      lastLogin: teacher.user.lastLoginAt?.toISOString(),
    };
  }

  async updateTeacher(
    userId: string,
    teacherId: string,
    updateTeacherDto: UpdateTeacherDto,
  ): Promise<TeacherResult> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    // Check if teacher exists
    const existingTeacher = await this.prisma.teacher.findFirst({
      where: {
        id: teacherId,
        user: { schoolId: user.schoolId, deletedAt: null },
        deletedAt: null,
      },
      include: { user: true },
    });

    if (!existingTeacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Check for email/phone conflicts within the school scope (excluding current teacher)
    if (updateTeacherDto.email && updateTeacherDto.email !== existingTeacher.user.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: {
          email: updateTeacherDto.email,
          schoolId: user.schoolId,
          deletedAt: null,
          id: { not: existingTeacher.userId },
        },
      });

      if (existingEmail) {
        throw new ConflictException('Email address is already in use in this school');
      }
    }

    if (updateTeacherDto.phone && updateTeacherDto.phone !== existingTeacher.user.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: {
          phone: updateTeacherDto.phone,
          schoolId: user.schoolId,
          deletedAt: null,
          id: { not: existingTeacher.userId },
        },
      });

      if (existingPhone) {
        throw new ConflictException('Phone number is already in use in this school');
      }
    }

    // Check if teacher ID is being updated and if it already exists globally
    if (updateTeacherDto.teacherId && updateTeacherDto.teacherId !== existingTeacher.teacherNo) {
      const existingTeacherId = await this.prisma.teacher.findFirst({
        where: {
          teacherNo: updateTeacherDto.teacherId,
          deletedAt: null,
          id: { not: teacherId },
        },
      });

      if (existingTeacherId) {
        throw new ConflictException('Teacher ID is already in use');
      }
    }

    // Update in transaction
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Update user
        const userUpdateData: any = {};
        if (updateTeacherDto.firstName) userUpdateData.firstName = updateTeacherDto.firstName;
        if (updateTeacherDto.lastName) userUpdateData.lastName = updateTeacherDto.lastName;
        if (updateTeacherDto.email) userUpdateData.email = updateTeacherDto.email;
        if (updateTeacherDto.phone) userUpdateData.phone = updateTeacherDto.phone;
        if (updateTeacherDto.gender) userUpdateData.gender = updateTeacherDto.gender;
        if (updateTeacherDto.stateOfOrigin)
          userUpdateData.stateOfOrigin = updateTeacherDto.stateOfOrigin;
        if (updateTeacherDto.addressId) userUpdateData.addressId = updateTeacherDto.addressId;
        if (updateTeacherDto.avatarUrl) userUpdateData.avatarUrl = updateTeacherDto.avatarUrl;
        if (updateTeacherDto.dateOfBirth)
          userUpdateData.dateOfBirth = new Date(updateTeacherDto.dateOfBirth);
        if (updateTeacherDto.password) {
          userUpdateData.password = await this.passwordHasher.hash(updateTeacherDto.password);
        }

        if (Object.keys(userUpdateData).length > 0) {
          await tx.user.update({
            where: { id: existingTeacher.userId },
            data: userUpdateData,
          });
        }

        // Update teacher
        const teacherUpdateData: any = {};
        if (updateTeacherDto.departmentId)
          teacherUpdateData.departmentId = updateTeacherDto.departmentId;
        if (updateTeacherDto.status) teacherUpdateData.status = updateTeacherDto.status;
        if (updateTeacherDto.employmentType)
          teacherUpdateData.employmentType = updateTeacherDto.employmentType;
        if (updateTeacherDto.qualification)
          teacherUpdateData.qualification = updateTeacherDto.qualification;
        if (updateTeacherDto.joinDate)
          teacherUpdateData.joinDate = new Date(updateTeacherDto.joinDate);

        if (Object.keys(teacherUpdateData).length > 0) {
          await tx.teacher.update({
            where: { id: teacherId },
            data: teacherUpdateData,
          });
        }

        // Return updated teacher
        return tx.teacher.findUnique({
          where: { id: teacherId },
          include: {
            user: true,
            department: true,
            classArmSubjectTeachers: {
              include: { subject: true },
            },
            classArmTeachers: {
              include: { classArm: true },
            },
            classArmsAsTeacher: true,
          },
        });
      });

      return this.mapTeacherToResult(result!);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[];
          if (target && target.length >= 2) {
            if (target.includes('email') && target.includes('schoolId')) {
              throw new ConflictException('Email address is already in use in this school');
            } else if (target.includes('phone') && target.includes('schoolId')) {
              throw new ConflictException('Phone number is already in use in this school');
            } else if (target.includes('teacherNo')) {
              throw new ConflictException('Teacher ID is already in use');
            }
          } else {
            // Fallback for other unique constraint violations
            const field = target?.[0];
            if (field === 'email') {
              throw new ConflictException('Email address is already in use in this school');
            } else if (field === 'phone') {
              throw new ConflictException('Phone number is already in use in this school');
            } else if (field === 'teacherNo') {
              throw new ConflictException('Teacher ID is already in use');
            }
          }
        }
      }
      throw error;
    }
  }

  async deleteTeacher(userId: string, teacherId: string): Promise<void> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not found or not associated with a school');
    }

    // Check if teacher exists
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        id: teacherId,
        user: { schoolId: user.schoolId, deletedAt: null },
        deletedAt: null,
      },
      include: { user: true },
    });

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    // Soft delete in transaction
    await this.prisma.$transaction(async (tx) => {
      // Soft delete teacher
      await tx.teacher.update({
        where: { id: teacherId },
        data: { deletedAt: new Date() },
      });

      // Soft delete user
      await tx.user.update({
        where: { id: teacher.userId },
        data: { deletedAt: new Date() },
      });
    });
  }

  async getTeacherStats(userId: string): Promise<TeacherStatsResult> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not found or not associated with a school');
    }

    const [
      totalTeachers,
      activeTeachers,
      inactiveTeachers,
      onLeaveTeachers,
      fullTimeTeachers,
      partTimeTeachers,
      contractTeachers,
    ] = await Promise.all([
      this.prisma.teacher.count({
        where: {
          user: { schoolId: user.schoolId, deletedAt: null },
          deletedAt: null,
        },
      }),
      this.prisma.teacher.count({
        where: {
          user: { schoolId: user.schoolId, deletedAt: null },
          status: 'ACTIVE',
          deletedAt: null,
        },
      }),
      this.prisma.teacher.count({
        where: {
          user: { schoolId: user.schoolId, deletedAt: null },
          status: 'INACTIVE',
          deletedAt: null,
        },
      }),
      this.prisma.teacher.count({
        where: {
          user: { schoolId: user.schoolId, deletedAt: null },
          status: 'ON_LEAVE',
          deletedAt: null,
        },
      }),
      this.prisma.teacher.count({
        where: {
          user: { schoolId: user.schoolId, deletedAt: null },
          employmentType: 'FULL_TIME',
          deletedAt: null,
        },
      }),
      this.prisma.teacher.count({
        where: {
          user: { schoolId: user.schoolId, deletedAt: null },
          employmentType: 'PART_TIME',
          deletedAt: null,
        },
      }),
      this.prisma.teacher.count({
        where: {
          user: { schoolId: user.schoolId, deletedAt: null },
          employmentType: 'CONTRACT',
          deletedAt: null,
        },
      }),
    ]);

    return {
      totalTeachers,
      activeTeachers,
      inactiveTeachers,
      onLeaveTeachers,
      fullTimeTeachers,
      partTimeTeachers,
      contractTeachers,
    };
  }

  private async generateTeacherNumber(): Promise<string> {
    // Since teacherNo is globally unique, we need to find the last teacher number across all schools
    const lastTeacher = await this.prisma.teacher.findFirst({
      where: {
        deletedAt: null,
        teacherNo: {
          not: {
            contains: 'NaN',
          },
        },
      },
      orderBy: { teacherNo: 'desc' },
    });

    if (!lastTeacher) {
      return 'TCH001';
    }

    const lastNumber = parseInt(lastTeacher.teacherNo.replace('TCH', ''));

    // Handle invalid numbers (like NaN)
    if (isNaN(lastNumber)) {
      // Find the highest valid number
      const allTeachers = await this.prisma.teacher.findMany({
        where: {
          deletedAt: null,
          teacherNo: {
            startsWith: 'TCH',
          },
        },
        select: {
          teacherNo: true,
        },
        orderBy: { teacherNo: 'desc' },
      });

      let maxNumber = 0;
      for (const teacher of allTeachers) {
        const number = parseInt(teacher.teacherNo.replace('TCH', ''));
        if (!isNaN(number) && number > maxNumber) {
          maxNumber = number;
        }
      }

      return `TCH${(maxNumber + 1).toString().padStart(3, '0')}`;
    }

    const nextNumber = lastNumber + 1;
    return `TCH${nextNumber.toString().padStart(3, '0')}`;
  }

  private mapTeacherToResult(teacher: any): TeacherResult {
    const subjects = teacher.classArmSubjectTeachers?.map((cast: any) => cast.subject.name) || [];
    const assignedClasses = [
      ...(teacher.classArmTeachers?.map((cat: any) => cat.classArm.name) || []),
      ...(teacher.classArmsAsTeacher?.map((classArm: any) => classArm.name) || []),
    ];

    const experience = Math.floor(
      (Date.now() - new Date(teacher.joinDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );

    return {
      id: teacher.id,
      teacherId: teacher.teacherNo,
      fullName: `${teacher.user.firstName} ${teacher.user.lastName}`,
      stateOfOrigin: teacher.user.stateOfOrigin,
      emailAddress: teacher.user.email || '',
      phoneNumber: teacher.user.phone || '',
      gender: teacher.user.gender === 'MALE' ? 'Male' : 'Female',
      profilePictureUrl: teacher.user.avatarUrl,
      department: teacher.department?.name,
      employmentType: teacher.employmentType.toLowerCase().replace('_', '-'),
      status: teacher.status.toLowerCase().replace('_', '-'),
      qualification: teacher.qualification || 'Not specified',
      joinDate: teacher.joinDate.toISOString().split('T')[0],
      experience,
      assignedClasses,
      subjects,
      createdAt: teacher.createdAt.toISOString(),
      updatedAt: teacher.updatedAt.toISOString(),
    };
  }
}
