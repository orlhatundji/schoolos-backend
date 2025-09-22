import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StudentStatus, UserType } from '@prisma/client';

import { BaseService } from '../../common/base-service';
import { CounterService } from '../../common/counter';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordHasher } from '../../utils/hasher/hasher';
import { getNextUserEntityNoFormatted } from '../../utils/misc';
import { PasswordGenerator } from '../../utils/password/password.generator';
import { SchoolsService } from '../schools';
import { UserTypes } from '../users/constants';
import { UsersService } from '../users/users.service';
import { CreateStudentDto, StudentQueryDto, UpdateStudentDto, UpdateStudentStatusDto } from './dto';
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
      classArmId,
      guardianId,
      admissionNo,
      admissionDate: dateTime,
    };

    const student = await this.studentsRepository.create(studentData, {
      include: { user: true },
    });

    // TODO: Handle guardianInformation, medicalInformation, and address
    // These should be processed separately and stored in appropriate models
    // For now, we'll just log them for future implementation
    if (guardianInformation) {
    }
    if (medicalInformation) {
    }
    if (address) {
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

    if (levelId) {
      where.classArm = { levelId };
    }

    if (classArmId) {
      where.classArmId = classArmId;
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
      orderBy.classArm = { level: { name: sortOrder } };
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

      // Ensure classArm and level are properly included
      if (!student.classArm?.level) {
        throw new Error(`ClassArm level not found for student ${student.id}`);
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
          id: student.classArm.level.id,
          name: student.classArm.level.name,
        },
        classArm: {
          id: student.classArm.id,
          name: student.classArm.name,
          fullName: `${student.classArm.level.name} ${student.classArm.name}`,
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
              relationship: 'Parent', // TODO: Add relationship field
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
    return this.studentsRepository.findById(id);
  }

  async update(id: string, updateStudentDto: UpdateStudentDto) {
    // Check if student exists
    const existingStudent = await this.findOne(id);
    if (!existingStudent) {
      throw new NotFoundException(`Student with ID '${id}' not found.`);
    }

    // Prepare the update data for Prisma
    const updateData: Prisma.StudentUpdateInput = {};

    // Handle classArmId - convert to classArm relation
    if (updateStudentDto.classArmId) {
      updateData.classArm = {
        connect: { id: updateStudentDto.classArmId },
      };
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
      const levelName = student.classArm.level.name;
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
            select: {
              id: true,
              name: true,
            },
            orderBy: {
              name: 'asc',
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      // Transform the data to match the expected API response format
      const transformedLevels = levels.map((level) => ({
        id: level.id,
        name: level.name,
        classArms: level.classArms.map((classArm) => ({
          id: classArm.id,
          name: classArm.name,
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
              students: {
                where: {
                  deletedAt: null,
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
        name: `${classArm.level.name} ${classArm.name}`,
        studentCount: classArm._count.students,
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
}
