import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StudentStatus, UserType } from '@prisma/client';

import { BaseService } from '../../common/base-service';
import { CounterService } from '../../common/counter';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordHasher } from '../../utils/hasher/hasher';
import { getNextUserEntityNoFormatted } from '../../utils/misc';
import { PasswordGenerator } from '../../utils/password/password.generator';
import { SchoolsService } from '../schools';
import { ClassArmStudentService } from './services/class-arm-student.service';
import { UserTypes } from '../users/constants';
import { UsersService } from '../users/users.service';
import { CreateStudentDto, StudentQueryDto, UpdateStudentDto, UpdateStudentStatusDto, TransferStudentClassDto } from './dto';
import { StudentMessages } from './results';
import { StudentsRepository } from './students.repository';
import { Student, StudentWithIncludes } from './types';

@Injectable()
export class StudentsService extends BaseService {
  constructor(
    private readonly userService: UsersService,
    private readonly studentsRepository: StudentsRepository,
    private readonly schoolsService: SchoolsService,
    private readonly counterService: CounterService,
    private readonly prisma: PrismaService,
    private readonly passwordGenerator: PasswordGenerator,
    private readonly passwordHasher: PasswordHasher,
    private readonly classArmStudentService: ClassArmStudentService,
  ) {
    super(StudentsService.name);
  }

  async create(createStudentDto: CreateStudentDto, schoolId: string): Promise<Student> {
    if (createStudentDto.admissionNo) {
      await this.throwIfStudentAdmissionNoExists(createStudentDto.admissionNo);
    }

    return this.save(createStudentDto, schoolId);
  }

  private async throwIfStudentAdmissionNoExists(admissionNo: string) {
    const existingStudent = await this.studentsRepository.findOne({
      where: { admissionNo },
    });

    if (existingStudent) {
      throw new BadRequestException(StudentMessages.FAILURE.STUDENT_ADMISSION_NO_EXISTS);
    }
  }

  private async save(createStudentDto: CreateStudentDto, schoolId: string): Promise<Student> {
    const {
      classArmId,
      guardianId,
      admissionDate,
      admissionNo,
      guardianInformation,
      medicalInformation,
      address,
      ...userData
    } = createStudentDto;

    // Generate default password
    const defaultPassword = this.passwordGenerator.generate();
    const hashedPassword = await this.passwordHasher.hash(defaultPassword);

    // Create user data with only User model fields
    const userCreateData = {
      ...userData,
      password: hashedPassword,
      type: UserType.STUDENT,
      schoolId: schoolId,
      mustUpdatePassword: true, // Force password change on first login
      dateOfBirth: userData.dateOfBirth || new Date().toISOString().split('T')[0], // Provide default date string if not set
      email:
        userData.email ||
        `${userData.firstName.toLowerCase()}.${userData.lastName.toLowerCase()}@${schoolId}.student`, // Generate email if not provided
      phone: userData.phone || '', // Provide empty string if not provided
    };

    const user = await this.userService.save(userCreateData);
    const school = await this.schoolsService.getSchoolById(schoolId);
    const dateTime = admissionDate || new Date();

    const nextSeq = await this.counterService.getNextSequenceNo(UserTypes.STUDENT, school.id);
    const studentNo = getNextUserEntityNoFormatted(
      UserTypes.STUDENT,
      school.code,
      dateTime,
      nextSeq,
    );

    const studentData = {
      userId: user.id,
      studentNo,
      guardianId,
      admissionNo,
      admissionDate: dateTime,
    };

    const student = await this.studentsRepository.create(studentData, {
      include: { user: true },
    });

    // Get the current academic session for the school
    const currentSession = await this.prisma.academicSession.findFirst({
      where: {
        schoolId,
        isCurrent: true,
        deletedAt: null,
      },
    });

    if (!currentSession) {
      throw new BadRequestException('No current academic session found for this school');
    }

    // Create ClassArmStudent relationship
    await this.classArmStudentService.enrollStudent(
      student.id,
      classArmId,
      currentSession.id
    );

    // Note: guardianInformation, medicalInformation, and address handling
    // These fields are received but not yet processed - requires additional
    // database models and service logic to be implemented
    if (guardianInformation) {
      // Guardian information processing not yet implemented
    }
    if (medicalInformation) {
      // Medical information processing not yet implemented
    }
    if (address) {
      // Address information processing not yet implemented
    }

    return student;
  }

  async getStudentsList(query: StudentQueryDto, schoolId: string) {
    const {
      page = 1,
      limit = 10,
      search,
      levelId,
      classArmId,
      gender,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.StudentWhereInput = {
      user: { schoolId },
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { studentNo: { contains: search, mode: 'insensitive' } },
        { admissionNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get current academic session
    const currentSession = await this.prisma.academicSession.findFirst({
      where: {
        schoolId,
        isCurrent: true,
        deletedAt: null,
      },
    });

    if (!currentSession) {
      throw new BadRequestException('No current academic session found for this school');
    }

    if (levelId || classArmId) {
      where.classArmStudents = {
        some: {
          academicSessionId: currentSession.id,
          isActive: true,
          deletedAt: null,
          ...(levelId && {
            classArm: { levelId }
          }),
          ...(classArmId && {
            classArmId
          })
        }
      };
    }

    if (gender) {
      where.user = { gender: gender as any };
    }

    // Build order by clause
    const orderBy: Prisma.StudentOrderByWithRelationInput = {};
    if (sortBy === 'name') {
      orderBy.user = { firstName: sortOrder };
    } else if (sortBy === 'age') {
      orderBy.user = { dateOfBirth: sortOrder === 'desc' ? 'asc' : 'desc' };
    } else if (sortBy === 'level') {
      orderBy.classArmStudents = { 
        _count: 'desc'
      };
    } else if (sortBy === 'studentId') {
      orderBy.studentNo = sortOrder;
    } else if (sortBy === 'status') {
      // Add status ordering when status field is implemented
      orderBy.createdAt = sortOrder;
    } else {
      orderBy[sortBy] = sortOrder;
    }

    // Get total count
    const totalItems = await this.studentsRepository.count({ where });

    // Get students with pagination using the enhanced repository method
    const students: StudentWithIncludes[] = await this.studentsRepository.findAllWithIncludes({
      where,
      orderBy,
      take: limit,
      skip,
    });

    // Transform students to list format
    const transformedStudents = students.map((student, index) => {
      const age = student.user.dateOfBirth
        ? Math.floor(
            (Date.now() - new Date(student.user.dateOfBirth).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000),
          )
        : 0;

      // Get the current active class arm for this student
      const currentClassArmStudent = student.classArmStudents.find(cas => cas.isActive);
      
      if (!currentClassArmStudent?.classArm?.level) {
        throw new Error(`Active ClassArm level not found for student ${student.id}`);
      }

      return {
        id: student.id,
        serialNumber: skip + index + 1,
        user: {
          id: student.user.id,
          firstName: student.user.firstName,
          lastName: student.user.lastName,
          email: student.user.email,
          avatar: student.user.avatarUrl,
          dateOfBirth: student.user.dateOfBirth,
          gender: student.user.gender,
        },
        studentId: student.studentNo,
        studentNo: student.studentNo,
        admissionNo: student.admissionNo,
        admissionDate: student.admissionDate,
        level: {
          id: currentClassArmStudent.classArm.level.id,
          name: currentClassArmStudent.classArm.level.name,
        },
        classArm: {
          id: currentClassArmStudent.classArm.id,
          name: currentClassArmStudent.classArm.name,
          fullName: `${currentClassArmStudent.classArm.level.name} ${currentClassArmStudent.classArm.name}`,
        },
        age,
        gender: student.user.gender,
        status: {
          current: student.status || 'active',
          label: this.getStatusLabel(student.status),
          badge: this.getStatusBadge(student.status),
        },
        guardian: student.guardian
          ? {
              id: student.guardian.id,
              name: `${student.guardian.user.firstName} ${student.guardian.user.lastName}`,
              phone: student.guardian.user.phone,
              email: student.guardian.user.email,
              relationship: 'Parent', // Default relationship - field not yet implemented
            }
          : undefined,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Calculate summary statistics
    const statusBreakdown = await this.getStatusBreakdown(schoolId);
    const genderBreakdown = await this.getGenderBreakdown(schoolId);
    const levelBreakdown = await this.getLevelBreakdown(schoolId);
    const ageDistribution = await this.getAgeDistribution(schoolId);

    return {
      students: transformedStudents,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage,
        hasPreviousPage,
      },
      summary: {
        totalStudents: totalItems,
        displayedRange: `${skip + 1} to ${Math.min(skip + limit, totalItems)} of ${totalItems} students`,
        statusBreakdown,
        genderBreakdown,
        levelBreakdown,
        ageDistribution,
      },
    };
  }

  getStudentByStudentNo(studentNo: string): Promise<Student> {
    return this.studentsRepository.findOneByStudentNo(studentNo);
  }

  getStudentByUserId(userId: string): Promise<Student> {
    return this.studentsRepository.findOne({
      where: { userId },
      include: {
        user: {
          include: {
            school: true,
          },
        },
      },
    });
  }

  findAll() {
    return this.studentsRepository.findAll();
  }

  findOne(id: string) {
    return this.studentsRepository.findById(id, {
      include: {
        user: true,
        classArmStudents: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          include: {
            classArm: {
              include: {
                level: true,
                school: true,
              },
            },
            academicSession: true,
          },
        },
        guardian: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async update(id: string, updateStudentDto: UpdateStudentDto) {
    // Check if student exists
    const existingStudent = await this.findOne(id);
    if (!existingStudent) {
      throw new NotFoundException(`Student with ID '${id}' not found.`);
    }

    // Prepare the update data for Prisma
    const updateData: Prisma.StudentUpdateInput = {};

    // Handle classArmId - use ClassArmStudent service
    if (updateStudentDto.classArmId) {
      // Get current academic session
      const currentSession = await this.prisma.academicSession.findFirst({
        where: {
          schoolId: existingStudent.user.schoolId,
          isCurrent: true,
          deletedAt: null,
        },
      });

      if (!currentSession) {
        throw new BadRequestException('No current academic session found for this school');
      }

      // Transfer student to new class arm
      await this.classArmStudentService.transferStudent(
        id,
        existingStudent.classArmStudents.find(cas => cas.isActive)?.classArmId || '',
        updateStudentDto.classArmId,
        currentSession.id
      );
    }

    // Handle guardianId - convert to guardian relation
    if (updateStudentDto.guardianId) {
      updateData.guardian = {
        connect: { id: updateStudentDto.guardianId },
      };
    }

    // Handle admissionDate
    if (updateStudentDto.admissionDate) {
      updateData.admissionDate = updateStudentDto.admissionDate;
    }

    // Handle admissionNo
    if (updateStudentDto.admissionNo) {
      updateData.admissionNo = updateStudentDto.admissionNo;
    }

    // Handle avatarUrl - this should update the user, not the student
    if (updateStudentDto.avatarUrl) {
      await this.userService.update(existingStudent.userId, {
        avatarUrl: updateStudentDto.avatarUrl,
      });
    }

    // Handle guardianInformation - this should create/update guardian
    if (
      updateStudentDto.guardianInformation &&
      Object.keys(updateStudentDto.guardianInformation).length > 0
    ) {
      // TODO: Implement guardian information update logic
      // This would involve creating or updating a guardian record
    }

    // Handle medicalInformation - this should be stored in user or separate medical record
    if (
      updateStudentDto.medicalInformation &&
      Object.keys(updateStudentDto.medicalInformation).length > 0
    ) {
      // TODO: Implement medical information update logic
      // This would involve creating or updating medical records
    }

    // Handle address - this should create/update address
    if (updateStudentDto.address && Object.keys(updateStudentDto.address).length > 0) {
      // TODO: Implement address update logic
      // This would involve creating or updating an address record
    }

    // Only update if there's actual data to update
    if (Object.keys(updateData).length > 0) {
      return this.studentsRepository.update({ id }, updateData);
    }

    // Return the existing student if no updates
    return existingStudent;
  }

  remove(id: string) {
    return this.studentsRepository.delete({ id });
  }

  async getStudentOverview(schoolId: string) {
    const totalStudents = await this.studentsRepository.count({
      where: {
        user: { schoolId },
        deletedAt: null,
      },
    });

    const activeStudents = await this.studentsRepository.count({
      where: {
        user: { schoolId },
        deletedAt: null,
        // Add status filter when status field is implemented
      },
    });

    const inactiveStudents = await this.studentsRepository.count({
      where: {
        user: { schoolId },
        deletedAt: null,
        // Add status filter when status field is implemented
      },
    });

    const suspendedStudents = await this.studentsRepository.count({
      where: {
        user: { schoolId },
        deletedAt: null,
        // Add status filter when status field is implemented
      },
    });

    return {
      statistics: {
        totalStudents: {
          count: totalStudents,
          description: 'Across all classes',
        },
        activeStudents: {
          count: activeStudents,
          description: 'Currently enrolled',
        },
        inactive: {
          count: inactiveStudents,
          description: 'Not currently active',
        },
        suspended: {
          count: suspendedStudents,
          description: 'Currently suspended',
        },
      },
    };
  }

  private async getGenderBreakdown(schoolId: string) {
    const result = await this.studentsRepository.findAll({
      where: {
        user: { schoolId },
        deletedAt: null,
      },
      include: {
        user: {
          select: { gender: true },
        },
      },
    });

    const breakdown = { MALE: 0, FEMALE: 0 };
    result.forEach((student) => {
      breakdown[student.user.gender]++;
    });

    return breakdown;
  }

  private async getLevelBreakdown(schoolId: string) {
    const result = await this.studentsRepository.findAllWithIncludes({
      where: {
        user: { schoolId },
        deletedAt: null,
      },
    });

    const breakdown: Record<string, number> = {};
    result.forEach((student) => {
      const levelName = student.classArmStudents?.[0]?.classArm?.level?.name || 'N/A';
      breakdown[levelName] = (breakdown[levelName] || 0) + 1;
    });

    return breakdown;
  }

  private async getAgeDistribution(schoolId: string) {
    const result = await this.studentsRepository.findAll({
      where: {
        user: { schoolId },
        deletedAt: null,
      },
      include: {
        user: {
          select: { dateOfBirth: true },
        },
      },
    });

    const distribution: Record<string, number> = {};
    result.forEach((student) => {
      if (student.user.dateOfBirth) {
        const age = Math.floor(
          (Date.now() - new Date(student.user.dateOfBirth).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        );
        distribution[age.toString()] = (distribution[age.toString()] || 0) + 1;
      }
    });

    return distribution;
  }

  /**
   * Get breakdown of students by status
   */
  private async getStatusBreakdown(schoolId: string) {
    const result = await this.studentsRepository.findAll({
      where: {
        user: { schoolId },
        deletedAt: null,
      },
      include: {
        user: {
          select: { id: true },
        },
      },
    });

    const breakdown = { active: 0, inactive: 0, suspended: 0, graduated: 0, transferred: 0 };
    result.forEach((student) => {
      const status = student.status || 'active';
      if (breakdown.hasOwnProperty(status)) {
        breakdown[status]++;
      } else {
        breakdown.active++; // Default to active if status is unknown
      }
    });

    return breakdown;
  }

  async updateStudentStatus(studentId: string, updateStatusDto: UpdateStudentStatusDto) {
    try {
      const student = await this.findOne(studentId);
      if (!student) {
        throw new NotFoundException(`Student with ID '${studentId}' not found.`);
      }

      const previousStatus = student.status || StudentStatus.ACTIVE;

      // Validate status transition (business logic)
      const isValidTransition = this.validateStatusTransition(
        previousStatus,
        updateStatusDto.status,
      );
      if (!isValidTransition.valid) {
        throw new BadRequestException(`Invalid status transition: ${isValidTransition.reason}`);
      }

      // Update the student status in the database
      await this.studentsRepository.update(
        { id: studentId },
        { status: updateStatusDto.status as any },
      );

      // Create status history record for audit trail
      const effectiveDate = updateStatusDto.effectiveDate
        ? new Date(updateStatusDto.effectiveDate)
        : new Date();

      await this.prisma.studentStatusHistory.create({
        data: {
          studentId,
          previousStatus,
          newStatus: updateStatusDto.status,
          reason: updateStatusDto.reason,
          effectiveDate,
          notes: updateStatusDto.notes,
          changedBy: 'system', // TODO: Get from request context when auth is implemented
        },
      });

      return {
        success: true,
        message: 'Student status updated successfully',
        statusChange: {
          studentId,
          studentName: `${student.user?.firstName} ${student.user?.lastName}`,
          previousStatus,
          newStatus: updateStatusDto.status,
          effectiveDate,
          reason: updateStatusDto.reason,
          notes: updateStatusDto.notes,
          changedAt: new Date(),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      console.error('Error updating student status:', error);
      throw new BadRequestException('Failed to update student status');
    }
  }

  /**
   * Validates if a status transition is allowed
   * This implements business logic for status changes
   */
  private validateStatusTransition(
    previousStatus: StudentStatus,
    newStatus: StudentStatus,
  ): { valid: boolean; reason?: string } {
    const transitions: Record<StudentStatus, StudentStatus[]> = {
      [StudentStatus.ACTIVE]: [
        StudentStatus.INACTIVE,
        StudentStatus.SUSPENDED,
        StudentStatus.GRADUATED,
        StudentStatus.TRANSFERRED,
      ],
      [StudentStatus.INACTIVE]: [
        StudentStatus.ACTIVE,
        StudentStatus.GRADUATED,
        StudentStatus.TRANSFERRED,
      ],
      [StudentStatus.SUSPENDED]: [
        StudentStatus.ACTIVE,
        StudentStatus.INACTIVE,
        StudentStatus.GRADUATED,
        StudentStatus.TRANSFERRED,
      ],
      [StudentStatus.GRADUATED]: [], // Can't change from graduated
      [StudentStatus.TRANSFERRED]: [], // Can't change from transferred
    };

    const allowedTransitions = transitions[previousStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      return {
        valid: false,
        reason: `Cannot transition from '${previousStatus}' to '${newStatus}'. Allowed transitions: ${allowedTransitions.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get human-readable label for student status
   */
  private getStatusLabel(status?: string): string {
    switch (status) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      case 'suspended':
        return 'Suspended';
      case 'graduated':
        return 'Graduated';
      case 'transferred':
        return 'Transferred';
      default:
        return 'Active';
    }
  }

  /**
   * Get badge configuration for student status
   */
  private getStatusBadge(status?: string) {
    switch (status) {
      case 'active':
        return {
          text: 'Active',
          color: 'green',
          backgroundColor: '#e8f5e8',
        };
      case 'inactive':
        return {
          text: 'Inactive',
          color: 'gray',
          backgroundColor: '#f3f4f6',
        };
      case 'suspended':
        return {
          text: 'Suspended',
          color: 'red',
          backgroundColor: '#fef2f2',
        };
      case 'graduated':
        return {
          text: 'Graduated',
          color: 'blue',
          backgroundColor: '#eff6ff',
        };
      case 'transferred':
        return {
          text: 'Transferred',
          color: 'orange',
          backgroundColor: '#fffbeb',
        };
      default:
        return {
          text: 'Active',
          color: 'green',
          backgroundColor: '#e8f5e8',
        };
    }
  }

  async getLevelsWithClassArms(schoolId: string) {
    try {
      // Query levels and their associated class arms from the database
      const levels = await this.prisma.level.findMany({
        where: {
          schoolId,
          deletedAt: null,
        },
        include: {
          classArms: {
            where: {
              schoolId,
              deletedAt: null,
            },
            include: {
              _count: {
                select: {
                  classArmStudents: {
                    where: {
                      isActive: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              name: 'asc',
            },
          },
        },
        orderBy: {
          order: 'asc',
        },
      });

      // Transform the data to match the expected API response format
      const transformedLevels = levels.map((level) => ({
        id: level.id,
        name: level.name,
        classArms: level.classArms.map((classArm) => ({
          id: classArm.id,
          name: classArm.name,
          studentCount: classArm._count.classArmStudents,
          currentCapacity: classArm._count.classArmStudents,
          maxCapacity: 30, // Default capacity, could be made configurable
        })),
      }));

      return {
        levels: transformedLevels,
      };
    } catch (error) {
      // Log the error for debugging
      console.error('Error fetching levels and class arms:', error);

      // Return empty structure if database query fails
      return {
        levels: [],
      };
    }
  }

  /**
   * Get higher levels for promotion (levels with order greater than the source level)
   */
  async getHigherLevelsForPromotion(schoolId: string, sourceLevelId: string) {
    try {
      // First get the source level to find its order
      const sourceLevel = await this.prisma.level.findUnique({
        where: { id: sourceLevelId },
        select: { order: true },
      });

      if (!sourceLevel) {
        throw new Error('Source level not found');
      }

      // Get all levels with order greater than the source level
      const higherLevels = await this.prisma.level.findMany({
        where: {
          schoolId,
          deletedAt: null,
          order: {
            gt: sourceLevel.order,
          },
        },
        include: {
          classArms: {
            where: {
              schoolId,
              deletedAt: null,
            },
            include: {
              _count: {
                select: {
                  classArmStudents: {
                    where: {
                      isActive: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              name: 'asc',
            },
          },
        },
        orderBy: {
          order: 'asc',
        },
      });

      // Transform the data to match the expected API response format
      const transformedLevels = higherLevels.map((level) => ({
        id: level.id,
        name: level.name,
        order: level.order,
        classArms: level.classArms.map((classArm) => ({
          id: classArm.id,
          name: classArm.name,
          studentCount: classArm._count.classArmStudents,
          currentCapacity: classArm._count.classArmStudents,
          maxCapacity: 30, // Default capacity, could be made configurable
        })),
      }));

      return {
        levels: transformedLevels,
      };
    } catch (error) {
      console.error('Error fetching higher levels for promotion:', error);
      return {
        levels: [],
      };
    }
  }

  /**
   * Get class arms for a specific academic session and level
   */
  async getClassArmsBySessionLevel(schoolId: string, academicSessionId: string, levelId: string) {
    try {
      const classArms = await this.prisma.classArm.findMany({
        where: {
          schoolId,
          academicSessionId,
          levelId,
          deletedAt: null, // Only get non-deleted class arms
        },
        include: {
          level: {
            select: {
              id: true,
              name: true,
            },
          },
          academicSession: {
            select: {
              id: true,
              academicYear: true,
            },
          },
          _count: {
            select: {
              classArmStudents: {
                where: {
                  isActive: true,
                },
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      const transformedClassArms = classArms.map((classArm) => ({
        id: classArm.id,
        name: classArm.name,
        levelId: classArm.levelId,
        levelName: classArm.level.name,
        academicSessionId: classArm.academicSessionId,
        academicSessionName: classArm.academicSession.academicYear,
        currentCapacity: classArm._count.classArmStudents,
        maxCapacity: 50, // Default capacity since maxCapacity doesn't exist in schema
        isActive: true, // Class arms are considered active if they exist and aren't deleted
      }));

      return {
        classArms: transformedClassArms,
      };
    } catch (error) {
      console.error('Error fetching class arms by session and level:', error);
      return {
        classArms: [],
      };
    }
  }

  async getFilterOptions(schoolId: string) {
    try {
      const genderBreakdown = await this.getGenderBreakdown(schoolId);
      const levelBreakdown = await this.getLevelBreakdown(schoolId);
      const ageDistribution = await this.getAgeDistribution(schoolId);

      // Get class arms with student counts from the database
      const classArmsWithCounts = await this.prisma.classArm.findMany({
        where: {
          schoolId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          level: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              classArmStudents: {
                where: {
                  isActive: true,
                },
              },
            },
          },
        },
        orderBy: [{ level: { name: 'asc' } }, { name: 'asc' }],
      });

      // Transform class arms data
      const transformedClassArms = classArmsWithCounts.map((classArm) => ({
        id: classArm.id,
        name: `${classArm.level?.name || 'N/A'} ${classArm.name}`,
        studentCount: classArm._count.classArmStudents,
      }));

      // Get actual status breakdown from database
      const statusBreakdown = await this.getStatusBreakdown(schoolId);

      return {
        levels: Object.entries(levelBreakdown).map(([name, count]) => ({
          id: `lvl_${name.toLowerCase().replace(/\s+/g, '')}`,
          name,
          studentCount: count,
        })),
        classArms: transformedClassArms,
        statuses: statusBreakdown,
        genders: Object.entries(genderBreakdown).map(([gender, count]) => ({
          gender,
          label: gender === 'MALE' ? 'Male' : 'Female',
          count,
        })),
        ageRanges: Object.entries(ageDistribution).map(([age, count]) => ({
          range: age,
          label: `${age} years`,
          count,
        })),
      };
    } catch (error) {
      // Log the error for debugging
      console.error('Error fetching filter options:', error);

      // Return empty structure if database query fails
      return {
        levels: [],
        classArms: [],
        statuses: [],
        genders: [],
        ageRanges: [],
      };
    }
  }

  /**
   * Transfer a student from one class arm to another within the same academic session
   */
  async transferStudentClass(studentId: string, transferDto: TransferStudentClassDto) {
    // Get current student with their active class arm enrollment
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
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

    if (student.classArmStudents.length === 0) {
      throw new BadRequestException('Student is not currently enrolled in any class arm');
    }

    const currentClassArmStudent = student.classArmStudents[0];
    const currentClassArm = currentClassArmStudent.classArm;

    // Get target class arm
    const targetClassArm = await this.prisma.classArm.findUnique({
      where: { id: transferDto.toClassArmId },
      include: {
        level: true,
        academicSession: true,
      },
    });

    if (!targetClassArm) {
      throw new NotFoundException('Target class arm not found');
    }

    // Validate that target class arm is in the same academic session
    if (targetClassArm.academicSessionId !== currentClassArm.academicSessionId) {
      throw new BadRequestException('Cannot transfer student to a class arm in a different academic session');
    }

    // Check if student is already in the target class arm
    if (currentClassArm.id === targetClassArm.id) {
      throw new BadRequestException('Student is already in the specified class arm');
    }

    // Use the existing transfer method from ClassArmStudentService
    const result = await this.classArmStudentService.transferStudent(
      studentId,
      currentClassArm.id,
      targetClassArm.id,
      currentClassArm.academicSessionId
    );

    return {
      success: true,
      message: `Student successfully transferred from ${currentClassArm.name} to ${targetClassArm.name}`,
      data: {
        studentId: student.id,
        studentName: `${student.user.firstName} ${student.user.lastName}`,
        fromClassArm: currentClassArm.name,
        toClassArm: targetClassArm.name,
        fromLevel: currentClassArm.level.name,
        toLevel: targetClassArm.level.name,
        reason: transferDto.reason,
      },
    };
  }

  /**
   * Copy classrooms from previous session to target session
   */
  async copyClassroomsFromPreviousSession(schoolId: string, targetSessionId: string) {
    return this.classArmStudentService.copyClassroomsFromPreviousSession(schoolId, targetSessionId);
  }

  /**
   * Get students from source class arm with their promotion status in target session
   */
  async getStudentsForImport(sourceClassArmId: string, targetSessionId: string) {
    return this.classArmStudentService.getStudentsForImport(sourceClassArmId, targetSessionId);
  }

  /**
   * Import selected students to target class arm
   */
  async importStudentsToClassArm(dto: {
    targetClassArmId: string;
    studentIds: string[];
    sourceClassArmId?: string;
  }) {
    return this.classArmStudentService.importStudentsToClassArm(dto);
  }
}
