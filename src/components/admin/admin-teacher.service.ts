import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UserType } from '@prisma/client';

import { PrismaService } from '../../prisma';
import { CurrentTermService } from '../../shared/services/current-term.service';
import { PasswordHasher } from '../../utils/hasher';
import { PasswordGenerator } from '../../utils/password/password.generator';
import { CounterService } from '../../common/counter';
import { MailQueueService } from '../../utils/mail-queue/mail-queue.service';
import { getNextUserEntityNoFormatted } from '../../utils/misc';
import { CreateTeacherDto, QueryTeachersDto, UpdateTeacherDto } from './dto';
import {
  TeacherDetailsResult,
  TeacherListResult,
  TeacherResult,
  TeacherStatsResult,
} from './results';

@Injectable()
export class AdminTeacherService {
  private readonly logger = new Logger(AdminTeacherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasher,
    private readonly passwordGenerator: PasswordGenerator,
    private readonly counterService: CounterService,
    private readonly mailQueueService: MailQueueService,
    private readonly currentTermService: CurrentTermService,
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

    // Get school code for teacher number generation
    const school = await this.prisma.school.findUnique({
      where: { id: user.schoolId },
      select: { code: true },
    });

    if (!school) {
      throw new BadRequestException('School not found');
    }

    // Generate teacher number if not provided
    const teacherNo =
      createTeacherDto.teacherId ||
      (await this.generateTeacherNumber(user.schoolId, school.code));

    // Generate password if not provided, then hash
    const plainTextPassword = createTeacherDto.password || this.passwordGenerator.generate();
    const hashedPassword = await this.passwordHasher.hash(plainTextPassword);

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
            mustUpdatePassword: true,
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

        // Handle per-classarm subject assignments if provided
        if (createTeacherDto.subjectAssignments && createTeacherDto.subjectAssignments.length > 0) {
          for (const assignment of createTeacherDto.subjectAssignments) {
            // Validate subject exists and belongs to the school
            const subject = await tx.subject.findFirst({
              where: {
                id: assignment.subjectId,
                schoolId: user.schoolId,
              },
            });

            if (!subject) {
              throw new BadRequestException(
                `Subject with ID ${assignment.subjectId} not found or does not belong to this school`,
              );
            }

            // Validate all class arms exist and belong to the school
            const classArms = await tx.classArm.findMany({
              where: {
                id: { in: assignment.classArmIds },
                schoolId: user.schoolId,
              },
            });

            if (classArms.length !== assignment.classArmIds.length) {
              throw new BadRequestException(
                'One or more class arms not found or do not belong to this school',
              );
            }

            // Upsert ClassArmSubject and create teacher assignments
            for (const classArmId of assignment.classArmIds) {
              const classArmSubject = await tx.classArmSubject.upsert({
                where: { classArmId_subjectId: { classArmId, subjectId: assignment.subjectId } },
                create: { classArmId, subjectId: assignment.subjectId },
                update: {},
              });
              await tx.classArmSubjectTeacher.create({
                data: {
                  classArmSubjectId: classArmSubject.id,
                  teacherId: teacher.id,
                },
              });
            }
          }
        }
        // Legacy: Assign subjects to ALL class arms if subjectIds provided
        else if (createTeacherDto.subjectIds && createTeacherDto.subjectIds.length > 0) {
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

          // Upsert ClassArmSubject and create teacher assignments
          for (const classArm of classArms) {
            for (const subjectId of createTeacherDto.subjectIds) {
              const classArmSubject = await tx.classArmSubject.upsert({
                where: { classArmId_subjectId: { classArmId: classArm.id, subjectId } },
                create: { classArmId: classArm.id, subjectId },
                update: {},
              });
              await tx.classArmSubjectTeacher.create({
                data: {
                  classArmSubjectId: classArmSubject.id,
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

          // Create corresponding ClassArmTeacher record
          await tx.classArmTeacher.create({
            data: {
              teacherId: teacher.id,
              classArmId: createTeacherDto.classArmId,
            },
          });
        }

        // Return teacher with all related data
        return tx.teacher.findUnique({
          where: { id: teacher.id },
          include: {
            user: true,
            department: true,
            classArmSubjectTeachers: {
              include: { classArmSubject: { include: { subject: true, classArm: true } } },
            },
            classArmTeachers: {
              include: { classArm: true },
            },
            classArmsAsTeacher: true,
          },
        });
      });

      // Send welcome email with credentials (non-blocking)
      try {
        const schoolInfo = await this.prisma.school.findUnique({
          where: { id: user.schoolId },
          select: { name: true },
        });
        const schoolName = schoolInfo?.name || 'School';

        await this.mailQueueService.add({
          recipientAddress: createTeacherDto.email,
          recipientName: `${createTeacherDto.firstName} ${createTeacherDto.lastName}`,
          subject: `Welcome to ${schoolName} - Your Login Credentials`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Welcome to ${schoolName}!</h2>
              <p>Hi ${createTeacherDto.firstName},</p>
              <p>Your teacher account has been created. Here are your login credentials:</p>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Teacher ID:</strong> ${teacherNo}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${createTeacherDto.email}</p>
                <p style="margin: 5px 0;"><strong>Password:</strong> ${plainTextPassword}</p>
              </div>
              <p style="color: #e74c3c;"><strong>Important:</strong> Please change your password after your first login.</p>
              <p>Best regards,<br/>The ${schoolName} Team</p>
            </div>
          `,
        });
      } catch (emailError) {
        this.logger.error(`Failed to queue welcome email for teacher ${teacherNo}:`, emailError);
      }

      return this.mapTeacherToResult(result);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[];
          if (target?.includes('teacherNo')) {
            throw new ConflictException('Teacher ID is already in use');
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

    const { page = 1, limit = 10, academicSessionId } = queryDto;
    const skip = (page - 1) * limit;

    // Get target session (either specified or current)
    let targetSession: { id: string } | null = null;
    if (academicSessionId) {
      targetSession = await this.prisma.academicSession.findFirst({
        where: { id: academicSessionId, schoolId: user.schoolId },
      });
    } else {
      const current = await this.currentTermService.getCurrentTermWithSession(user.schoolId);
      targetSession = current ? { id: current.session.id } : null;
    }

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
          where: targetSession ? {
            deletedAt: null,
            classArmSubject: {
              classArm: {
                academicSessionId: targetSession.id,
                deletedAt: null,
              },
            },
          } : undefined,
          include: {
            classArmSubject: {
              include: {
                subject: true,
                classArm: { include: { level: true } },
              },
            },
          },
        },
        classArmTeachers: {
          where: targetSession ? {
            deletedAt: null,
            classArm: {
              academicSessionId: targetSession.id,
              deletedAt: null,
            },
          } : undefined,
          include: { 
            classArm: {
              include: {
                level: true,
              },
            },
          },
        },
        classArmsAsTeacher: {
          where: targetSession ? {
            academicSessionId: targetSession.id,
            deletedAt: null,
          } : undefined,
          include: {
            level: true,
          },
        },
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
          include: { classArmSubject: { include: { subject: true, classArm: true } } },
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

        // Handle new per-classarm subject assignments if provided
        if (updateTeacherDto.subjectAssignments !== undefined) {
          // Delete all existing subject assignments for this teacher
          await tx.classArmSubjectTeacher.deleteMany({
            where: { teacherId },
          });

          // Create new assignments based on specific classArm-subject combinations
          for (const assignment of updateTeacherDto.subjectAssignments) {
            // Validate subject exists and belongs to the school
            const subject = await tx.subject.findFirst({
              where: {
                id: assignment.subjectId,
                schoolId: user.schoolId,
              },
            });

            if (!subject) {
              throw new BadRequestException(
                `Subject with ID ${assignment.subjectId} not found or does not belong to this school`,
              );
            }

            // Validate all class arms exist and belong to the school
            const classArms = await tx.classArm.findMany({
              where: {
                id: { in: assignment.classArmIds },
                schoolId: user.schoolId,
              },
            });

            if (classArms.length !== assignment.classArmIds.length) {
              throw new BadRequestException(
                'One or more class arms not found or do not belong to this school',
              );
            }

            // Upsert ClassArmSubject and create teacher assignments
            for (const classArmId of assignment.classArmIds) {
              const classArmSubject = await tx.classArmSubject.upsert({
                where: { classArmId_subjectId: { classArmId, subjectId: assignment.subjectId } },
                create: { classArmId, subjectId: assignment.subjectId },
                update: {},
              });
              await tx.classArmSubjectTeacher.create({
                data: {
                  classArmSubjectId: classArmSubject.id,
                  teacherId,
                },
              });
            }
          }
        }
        // Legacy: Update subjects if provided (assigns to all class arms)
        else if (updateTeacherDto.subjectIds !== undefined) {
          // Delete all existing subject assignments for this teacher
          await tx.classArmSubjectTeacher.deleteMany({
            where: { teacherId },
          });

          // If subjectIds array is provided and not empty, create new assignments
          if (updateTeacherDto.subjectIds.length > 0) {
            // Validate that all subjects exist and belong to the school
            const subjects = await tx.subject.findMany({
              where: {
                id: { in: updateTeacherDto.subjectIds },
                schoolId: user.schoolId,
              },
            });

            if (subjects.length !== updateTeacherDto.subjectIds.length) {
              throw new BadRequestException(
                'One or more subjects not found or do not belong to this school',
              );
            }

            // Get class arms for the school
            const classArms = await tx.classArm.findMany({
              where: { schoolId: user.schoolId },
            });

            if (classArms.length === 0) {
              throw new BadRequestException('No class arms found for this school');
            }

            // Upsert ClassArmSubject and create teacher assignments
            for (const classArm of classArms) {
              for (const subjectId of updateTeacherDto.subjectIds) {
                const classArmSubject = await tx.classArmSubject.upsert({
                  where: { classArmId_subjectId: { classArmId: classArm.id, subjectId } },
                  create: { classArmId: classArm.id, subjectId },
                  update: {},
                });
                await tx.classArmSubjectTeacher.create({
                  data: {
                    classArmSubjectId: classArmSubject.id,
                    teacherId,
                  },
                });
              }
            }
          }
        }

        // Return updated teacher
        return tx.teacher.findUnique({
          where: { id: teacherId },
          include: {
            user: true,
            department: true,
            classArmSubjectTeachers: {
              include: { classArmSubject: { include: { subject: true, classArm: true } } },
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
          if (target?.includes('teacherNo')) {
            throw new ConflictException('Teacher ID is already in use');
          }
        }
      }
      throw error;
    }
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

  private async generateTeacherNumber(schoolId: string, schoolCode: string): Promise<string> {
    const nextSeq = await this.counterService.getNextSequenceNo(UserType.TEACHER, schoolId);
    return getNextUserEntityNoFormatted(UserType.TEACHER, schoolCode, new Date(), nextSeq);
  }

  private mapTeacherToResult(teacher: any): TeacherResult {
    const subjects = teacher.classArmSubjectTeachers?.map((cast: any) => cast.classArmSubject.subject.name) || [];
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

  async getTeacherSubjectAssignments(userId: string, teacherId: string) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    // Get current academic session
    const current = await this.currentTermService.getCurrentTermWithSession(user.schoolId);

    // Get teacher's subject assignments with class arm and subject details
    const assignments = await this.prisma.classArmSubjectTeacher.findMany({
      where: {
        teacherId,
        deletedAt: null,
        ...(current && {
          classArmSubject: {
            classArm: {
              academicSessionId: current.session.id,
              deletedAt: null,
            },
          },
        }),
      },
      include: {
        classArmSubject: {
          include: {
            subject: true,
            classArm: { include: { level: true } },
          },
        },
      },
    });

    // Group assignments by subject
    const subjectMap = new Map<string, {
      subjectId: string;
      subjectName: string;
      classArms: Array<{
        id: string;
        name: string;
        level: string;
      }>;
    }>();

    for (const assignment of assignments) {
      const { subject, classArm } = assignment.classArmSubject;
      const existing = subjectMap.get(subject.id);
      const classArmInfo = {
        id: classArm.id,
        name: classArm.name,
        level: classArm.level?.name || '',
      };

      if (existing) {
        existing.classArms.push(classArmInfo);
      } else {
        subjectMap.set(subject.id, {
          subjectId: subject.id,
          subjectName: subject.name,
          classArms: [classArmInfo],
        });
      }
    }

    return {
      subjectAssignments: Array.from(subjectMap.values()),
    };
  }

  async deleteTeacher(userId: string, teacherId: string): Promise<{ message: string }> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not associated with a school');
    }

    // Check if teacher exists and belongs to the school
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        id: teacherId,
        user: {
          schoolId: user.schoolId,
        },
        deletedAt: null,
      },
      include: {
        classArmSubjectTeachers: {
          where: { deletedAt: null },
        },
        classArmTeachers: {
          where: { deletedAt: null },
        },
        classArmsAsTeacher: {
          where: { deletedAt: null },
        },
        hod: {
          where: { deletedAt: null },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found or access denied');
    }

    // Check if teacher has any active assignments
    const hasSubjectAssignments = teacher.classArmSubjectTeachers.length > 0;
    const hasClassAssignments = teacher.classArmTeachers.length > 0;
    const hasClassTeacherRole = teacher.classArmsAsTeacher.length > 0;
    const isHeadOfDepartment = teacher.hod !== null;

    if (hasSubjectAssignments || hasClassAssignments || hasClassTeacherRole || isHeadOfDepartment) {
      const reasons = [];
      if (hasSubjectAssignments) reasons.push('subject assignments');
      if (hasClassAssignments) reasons.push('class assignments');
      if (hasClassTeacherRole) reasons.push('class teacher roles');
      if (isHeadOfDepartment) reasons.push('head of department role');

      throw new BadRequestException(
        `Cannot delete teacher. They have active ${reasons.join(', ')}. Please remove all assignments first.`,
      );
    }

    // Soft delete the teacher
    await this.prisma.teacher.update({
      where: { id: teacherId },
      data: { deletedAt: new Date() },
    });

    return { message: 'Teacher deleted successfully' };
  }
}
