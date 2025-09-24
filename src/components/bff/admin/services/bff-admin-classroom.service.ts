import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../prisma';
import { AdminClassroomsViewData, ClassroomDetailsData } from '../types';

@Injectable()
export class BffAdminClassroomService {
  constructor(private readonly prisma: PrismaService) {}

  async getClassroomsViewData(userId: string): Promise<AdminClassroomsViewData> {
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
      // Return empty data for new schools without academic sessions
      return {
        stats: {
          totalClassrooms: 0,
          totalStudents: 0,
          gradeLevels: 0,
          capacityUsage: 0,
        },
        classrooms: [],
      };
    }

    // Get all class arms for the school with their students and teachers (filtered by current session)
    const classArms = await this.prisma.classArm.findMany({
      where: { 
        schoolId,
        academicSessionId: currentSession.id,
        deletedAt: null,
      },
      include: {
        level: true,
        students: {
          where: {
            deletedAt: null,
          },
        },
        classTeacher: {
          include: {
            user: true,
          },
        },
        captain: {
          include: {
            user: true,
          },
        },
      } as any, // Temporary until Prisma types fully refresh
    });

    // Calculate stats (with type assertions until Prisma types fully refresh)
    const totalClassrooms = classArms.length;
    const totalStudents = (classArms as any[]).reduce(
      (sum, classArm) => sum + classArm.students.length,
      0,
    );

    // Get unique grade levels
    const gradeLevels = new Set((classArms as any[]).map((ca) => ca.level.name)).size;

    // Calculate capacity usage (placeholder calculation)
    const capacityUsage = Math.min(100, (totalStudents / (totalClassrooms * 30)) * 100);

    // Prepare classroom list using efficient direct references
    const classroomList = classArms.map((classArm) => {
      return {
        id: classArm.id,
        name: classArm.name,
        level: (classArm as any).level.name,
        location: null, // Add location field to ClassArm model if needed
        classTeacher: (classArm as any).classTeacher
          ? `${(classArm as any).classTeacher.user.firstName} ${(classArm as any).classTeacher.user.lastName}`
          : null,
        classCaptain: (classArm as any).captain
          ? `${(classArm as any).captain.user.firstName} ${(classArm as any).captain.user.lastName}`
          : null,
        studentsCount: (classArm as any).students.length,
      };
    });

    return {
      stats: {
        totalClassrooms,
        totalStudents,
        gradeLevels,
        capacityUsage: Math.round(capacityUsage * 100) / 100,
      },
      classrooms: classroomList,
    };
  }

  async getClassroomDetailsData(
    userId: string,
    classroomId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<ClassroomDetailsData> {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Get classroom details with efficient direct references
    const classroom = await this.prisma.classArm.findFirst({
      where: {
        id: classroomId,
        schoolId,
      },
      include: {
        level: true,
        classTeacher: {
          include: {
            user: true,
          },
        },
        captain: {
          include: {
            user: true,
          },
        },
      } as any, // Type assertion until VS Code restarts
    });

    if (!classroom) {
      throw new Error('Classroom not found or not accessible');
    }

    // Get total count of students in the classroom
    const totalStudents = await this.prisma.student.count({
      where: {
        classArmId: classroomId,
      },
    });

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(totalStudents / limit);

    // Get paginated students with all their data
    const paginatedStudents = await this.prisma.student.findMany({
      where: {
        classArmId: classroomId,
      },
      skip,
      take: limit,
      include: {
        user: {
          include: {
            address: true, // Include address for residential info
          },
        },
        prefect: true,
        guardian: {
          include: {
            user: true, // Include guardian's user data to get their name
          },
        },
        subjectTermStudents: {
          take: 50, // Limit to recent results
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            subjectTerm: {
              include: {
                subject: true,
              },
            },
            assessments: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    // Get all students for population and top performers calculation (without pagination)
    const allStudents = await this.prisma.student.findMany({
      where: {
        classArmId: classroomId,
      },
      include: {
        user: {
          include: {
            address: true, // Include address for residential info
          },
        },
        prefect: true,
        guardian: {
          include: {
            user: true, // Include guardian's user data
          },
        },
        subjectTermStudents: {
          take: 50,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            subjectTerm: {
              include: {
                subject: true,
              },
            },
            assessments: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    // Calculate population statistics
    const maleStudents = allStudents.filter((student) => student.user.gender === 'MALE').length;
    const femaleStudents = allStudents.filter((student) => student.user.gender === 'FEMALE').length;

    // Calculate attendance statistics
    const totalDays = 180; // Academic year days
    const presentDays = Math.floor(totalDays * (0.85 + Math.random() * 0.15)); // Random between 85-100%
    const absentDays = totalDays - presentDays;
    const attendanceRate = (presentDays / totalDays) * 100;

    // Calculate individual student attendance for today (realistic simulation)
    const studentsPresent = Math.floor(totalStudents * (0.9 + Math.random() * 0.08)); // 90-98% present today
    const studentsAbsent = totalStudents - studentsPresent;

    // Get class teacher and captain using efficient direct references
    const classTeacher = (classroom as any).classTeacher;
    const classCaptain = (classroom as any).captain;

    // Calculate top performers from assessment results
    const performanceMap = new Map<
      string,
      { totalScore: number; count: number; student: any; latestSubject: string }
    >();

    allStudents.forEach((student) => {
      student.subjectTermStudents.forEach((subjectTermStudent) => {
        const studentId = student.id;
        const existing = performanceMap.get(studentId) || {
          totalScore: 0,
          count: 0,
          student,
          latestSubject: subjectTermStudent.subjectTerm.subject.name,
        };

        existing.totalScore += subjectTermStudent.totalScore;
        existing.count += 1;
        performanceMap.set(studentId, existing);
      });
    });

    const topPerformers = Array.from(performanceMap.entries())
      .map(([studentId, data]) => ({
        id: studentId,
        name: `${data.student.user.firstName} ${data.student.user.lastName}`,
        score: data.count > 0 ? data.totalScore / data.count : 0,
        subject: data.latestSubject,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Prepare paginated student information
    const studentsData = paginatedStudents.map((student) => {
      const age = student.user.dateOfBirth
        ? Math.floor(
            (Date.now() - new Date(student.user.dateOfBirth).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000),
          )
        : 0;

      // Get guardian name
      const guardianName = student.guardian
        ? `${student.guardian.user.firstName} ${student.guardian.user.lastName}`
        : 'N/A';

      // Get state of origin from user's address
      const stateOfOrigin = student.user.stateOfOrigin || 'N/A';

      return {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        gender: student.user.gender,
        age,
        admissionNumber: student.admissionNo || 'N/A',
        guardianPhone: student.user.phone,
        guardianName,
        stateOfOrigin,
      };
    });

    // Create pagination info
    const paginationInfo = {
      page,
      limit,
      total: totalStudents,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };

    // Create paginated students response
    const students = {
      students: studentsData,
      pagination: paginationInfo,
    };

    return {
      classroom: {
        id: classroom.id,
        name: classroom.name,
        level: (classroom as any).level.name,
        location: null, // Add location field to ClassArm model if needed
      },
      population: {
        total: totalStudents,
        male: maleStudents,
        female: femaleStudents,
      },
      attendance: {
        totalDays,
        presentDays,
        absentDays,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        studentsPresent,
        studentsAbsent,
        totalStudents,
      },
      classTeacher: classTeacher
        ? {
            id: classTeacher.id,
            name: `${classTeacher.user.firstName} ${classTeacher.user.lastName}`,
            phone: classTeacher.user.phone,
            email: classTeacher.user.email,
          }
        : null,
      classCaptain: classCaptain
        ? {
            id: classCaptain.id,
            name: `${classCaptain.user.firstName} ${classCaptain.user.lastName}`,
            admissionNumber: classCaptain.admissionNo,
          }
        : null,
      students,
      topPerformers,
    };
  }
}
