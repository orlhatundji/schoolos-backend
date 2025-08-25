import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { TeacherStatus } from '@prisma/client';
import { DropdownData } from './types';

@Injectable()
export class DropdownsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDropdownData(
    userId: string,
    includeArchived: boolean = false,
    includeInactive: boolean = false,
    includeInactiveTeachers: boolean = false,
  ): Promise<DropdownData> {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Build department where clause
    const departmentWhere = {
      schoolId,
      ...(includeArchived ? {} : { deletedAt: null }),
    };

    // Build subject where clause
    const subjectWhere = {
      schoolId,
      ...(includeInactive ? {} : { deletedAt: null }),
    };

    // Build teacher where clause
    const teacherWhere = {
      user: { schoolId },
      ...(includeInactiveTeachers ? {} : { status: TeacherStatus.ACTIVE }),
      deletedAt: null,
    };

    // Fetch all data in parallel for better performance
    const [
      teachers,
      departments,
      academicSessions,
      levels,
      terms,
      subjects,
    ] = await Promise.all([
      // Teachers
      this.prisma.teacher.findMany({
        where: teacherWhere,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          department: {
            select: {
              name: true,
              code: true,
            },
          },
        },
        orderBy: [
          { user: { firstName: 'asc' } },
          { user: { lastName: 'asc' } },
        ],
      }),

      // Departments
      this.prisma.department.findMany({
        where: departmentWhere,
        include: {
          hod: {
            include: {
              teacher: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),

      // Academic Sessions
      this.prisma.academicSession.findMany({
        where: { schoolId },
        orderBy: { academicYear: 'desc' },
      }),

      // Levels
      this.prisma.level.findMany({
        where: { schoolId },
        orderBy: { name: 'asc' },
      }),

      // Terms
      this.prisma.term.findMany({
        include: {
          academicSession: {
            select: {
              academicYear: true,
            },
          },
        },
        orderBy: [
          { academicSession: { academicYear: 'desc' } },
          { name: 'asc' },
        ],
      }),

      // Subjects
      this.prisma.subject.findMany({
        where: subjectWhere,
        include: {
          department: {
            select: {
              name: true,
              code: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Transform teachers data
    const teachersData = teachers.map((teacher) => ({
      id: teacher.id,
      teacherNo: teacher.teacherNo,
      name: `${teacher.user.firstName} ${teacher.user.lastName}`,
      department: teacher.department?.name || null,
      departmentCode: teacher.department?.code || null,
      status: teacher.status,
    }));

    // Transform departments data
    const departmentsData = departments.map((department) => ({
      id: department.id,
      name: department.name,
      code: department.code,
      hodName: department.hod?.teacher?.user
        ? `${department.hod.teacher.user.firstName} ${department.hod.teacher.user.lastName}`
        : null,
      status: (department.deletedAt ? 'archived' : 'active') as 'active' | 'archived',
    }));

    // Transform academic sessions data
    const academicSessionsData = academicSessions.map((session) => ({
      id: session.id,
      academicYear: session.academicYear,
      isCurrent: session.isCurrent,
      startDate: session.startDate,
      endDate: session.endDate,
    }));

    // Transform levels data
    const levelsData = levels.map((level) => ({
      id: level.id,
      name: level.name,
    }));

    // Transform terms data
    const termsData = terms.map((term) => ({
      id: term.id,
      name: term.name,
      academicSessionId: term.academicSessionId,
      academicYear: term.academicSession.academicYear,
    }));

    // Transform subjects data
    const subjectsData = subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      category: subject.category,
      department: subject.department?.name || null,
      departmentCode: subject.department?.code || null,
      status: (subject.deletedAt ? 'inactive' : 'active') as 'active' | 'inactive',
    }));

    return {
      teachers: teachersData,
      departments: departmentsData,
      academicSessions: academicSessionsData,
      levels: levelsData,
      terms: termsData,
      subjects: subjectsData,
    };
  }
}
