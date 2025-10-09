import { Injectable } from '@nestjs/common';
import { TeacherStatus, EmploymentType } from '@prisma/client';

import { PrismaService } from '../../../../prisma';
import { TeachersViewData, SingleTeacherDetails } from '../types';

@Injectable()
export class BffAdminTeacherService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeachersViewData(userId: string, academicSessionId?: string): Promise<TeachersViewData> {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Get the target academic session (either specified or current)
    const targetSession = academicSessionId 
      ? await this.prisma.academicSession.findFirst({
          where: { id: academicSessionId, schoolId },
        })
      : await this.prisma.academicSession.findFirst({
          where: { schoolId, isCurrent: true },
        });

    if (!targetSession) {
      throw new Error('Academic session not found');
    }

    // Get all teachers for the school with their related data (filtered by current session)
    const teachers = await this.prisma.teacher.findMany({
      where: {
        user: {
          schoolId,
        },
        deletedAt: null,
      },
      include: {
        user: true,
        department: true, // Direct department relationship
        hod: {
          include: {
            department: true,
          },
        },
        classArmSubjectTeachers: {
          where: {
            deletedAt: null,
            classArm: {
              academicSessionId: targetSession.id,
              deletedAt: null,
            },
          },
          include: {
            subject: true,
            classArm: {
              include: {
                level: true,
              },
            },
          },
        },
        classArmTeachers: {
          where: {
            deletedAt: null,
            classArm: {
              academicSessionId: targetSession.id,
              deletedAt: null,
            },
          },
          include: {
            classArm: {
              include: {
                level: true,
              },
            },
          },
        },
        classArmsAsTeacher: {
          where: {
            academicSessionId: targetSession.id,
            deletedAt: null,
          },
          include: {
            level: true,
          },
        },
      },
    });

    // Calculate statistics using real data
    const totalTeachers = teachers.length;
    const activeTeachers = teachers.filter((t) => t.status === TeacherStatus.ACTIVE).length;
    const inactiveTeachers = teachers.filter((t) => t.status === TeacherStatus.INACTIVE).length;
    const onLeaveTeachers = teachers.filter((t) => t.status === TeacherStatus.ON_LEAVE).length;

    // Process teacher data
    const teachersData = teachers.map((teacher) => {
      // Get department name from direct relationship
      const department = teacher.department?.name || 'Unassigned';

      // Get subjects taught
      const subjects = teacher.classArmSubjectTeachers.map((cast) => cast.subject.name);

      // Get classes assigned
      const classesAssigned = [
        ...teacher.classArmTeachers.map((cat) => cat.classArm.name),
        ...teacher.classArmsAsTeacher.map((classArm) => classArm.name),
      ];

      // Calculate experience (years since join date)
      const joinDate = teacher.joinDate;
      const experience = Math.floor(
        (Date.now() - new Date(joinDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      );

      // Map employment type from enum to string
      const employmentTypeMap = {
        [EmploymentType.FULL_TIME]: 'full-time' as const,
        [EmploymentType.PART_TIME]: 'part-time' as const,
        [EmploymentType.CONTRACT]: 'contract' as const,
      };
      const employment = employmentTypeMap[teacher.employmentType];

      // Map status from enum to string
      const statusMap = {
        [TeacherStatus.ACTIVE]: 'active' as const,
        [TeacherStatus.INACTIVE]: 'inactive' as const,
        [TeacherStatus.ON_LEAVE]: 'on-leave' as const,
      };
      const status = statusMap[teacher.status];

      // Get last login from user
      const lastLogin = teacher.user.lastLoginAt?.toISOString() || null;

      return {
        id: teacher.id,
        firstName: teacher.user.firstName,
        lastName: teacher.user.lastName,
        email: teacher.user.email || '',
        phone: teacher.user.phone || '',
        department,
        subjects,
        employment,
        experience,
        qualification: teacher.qualification || 'Not specified',
        joinDate: joinDate.toISOString().split('T')[0], // YYYY-MM-DD format
        lastLogin,
        status,
        classesAssigned,
        avatar: teacher.user.avatarUrl,
      };
    });

    return {
      stats: {
        totalTeachers,
        activeTeachers,
        inactiveTeachers,
        onLeaveTeachers,
      },
      teachers: teachersData,
    };
  }

  async getSingleTeacherDetails(userId: string, teacherId: string): Promise<SingleTeacherDetails> {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Get the specific teacher with all necessary data
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        id: teacherId,
        user: {
          schoolId,
        },
        deletedAt: null,
      },
      include: {
        user: {
          include: {
            address: true,
          },
        },
        department: true,
        hod: {
          include: {
            department: true,
          },
        },
        classArmSubjectTeachers: {
          include: {
            subject: true,
          },
        },
        classArmTeachers: {
          include: {
            classArm: {
              include: {
                classArmStudents: {
                  where: { isActive: true }
                },
              },
            },
          },
        },
        classArmsAsTeacher: {
          include: {
            classArmStudents: {
              where: { isActive: true }
            },
          },
        },
      },
    });

    if (!teacher) {
      throw new Error('Teacher not found or not accessible');
    }

    // Get department name
    const department = teacher.department?.name || 'Unassigned';

    // Get subjects taught
    const subjects = teacher.classArmSubjectTeachers.map((cast) => cast.subject.name);

    // Get classes assigned
    const classesAssigned = [
      ...teacher.classArmTeachers.map((cat) => cat.classArm.name),
      ...teacher.classArmsAsTeacher.map((classArm) => classArm.name),
    ];

    // Calculate experience (years since join date)
    const joinDate = teacher.joinDate;
    const experience = Math.floor(
      (Date.now() - new Date(joinDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );

    // Map employment type from enum to string
    const employmentTypeMap = {
      [EmploymentType.FULL_TIME]: 'full-time' as const,
      [EmploymentType.PART_TIME]: 'part-time' as const,
      [EmploymentType.CONTRACT]: 'contract' as const,
    };
    const employment = employmentTypeMap[teacher.employmentType];

    // Map status from enum to string
    const statusMap = {
      [TeacherStatus.ACTIVE]: 'active' as const,
      [TeacherStatus.INACTIVE]: 'inactive' as const,
      [TeacherStatus.ON_LEAVE]: 'on-leave' as const,
    };
    const status = statusMap[teacher.status];

    // Get last login from user
    const lastLogin = teacher.user.lastLoginAt?.toISOString() || null;

    // Check if teacher is HOD
    const isHOD = !!teacher.hod;
    const hodDepartment = isHOD ? teacher.hod.department.name : null;

    // Calculate total students and average class size
    const allStudents = [
      ...teacher.classArmTeachers.flatMap((cat) => cat.classArm.classArmStudents),
      ...teacher.classArmsAsTeacher.flatMap((classArm) => classArm.classArmStudents),
    ];
    const totalStudents = allStudents.length;
    const averageClassSize =
      classesAssigned.length > 0 ? Math.round(totalStudents / classesAssigned.length) : 0;

    // Format date of birth
    const dateOfBirth = teacher.user.dateOfBirth
      ? teacher.user.dateOfBirth.toISOString().split('T')[0]
      : null;

    // Format address
    const address = teacher.user.address
      ? {
          street1: teacher.user.address.street1,
          street2: teacher.user.address.street2,
          city: teacher.user.address.city,
          state: teacher.user.address.state,
          country: teacher.user.address.country,
        }
      : null;

    return {
      id: teacher.id,
      firstName: teacher.user.firstName,
      lastName: teacher.user.lastName,
      email: teacher.user.email || '',
      phone: teacher.user.phone || '',
      department,
      subjects,
      employment,
      experience,
      qualification: teacher.qualification || 'Not specified',
      joinDate: joinDate.toISOString().split('T')[0], // YYYY-MM-DD format
      lastLogin,
      status,
      classesAssigned,
      avatar: teacher.user.avatarUrl,
      dateOfBirth,
      gender: teacher.user.gender === 'MALE' ? 'Male' : 'Female',
      stateOfOrigin: teacher.user.stateOfOrigin,
      address,
      isHOD,
      hodDepartment,
      totalStudents,
      averageClassSize,
    };
  }
}
