import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';

import { PrismaService } from '../../../../prisma';
import { AdminClassroomsViewData, ClassroomDetailsData, TopClassChampionsData } from '../types';
import { CreateClassroomDto } from '../dto/create-classroom.dto';

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
      select: {
        id: true,
        name: true,
        slug: true,
        location: true,
        level: true,
        classArmStudents: {
          where: {
            isActive: true,
          },
        },
        classTeacher: {
          select: {
            teacherNo: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        captain: {
          select: {
            id: true,
            studentNo: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Calculate stats (with type assertions until Prisma types fully refresh)
    const totalClassrooms = classArms.length;
    const totalStudents = (classArms as any[]).reduce(
      (sum, classArm) => sum + classArm.classArmStudents.length,
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
        slug: classArm.slug,
        level: classArm.level.name,
        location: classArm.location,
        classTeacher: {
          teacherNo: classArm.classTeacher?.teacherNo || null,
          name: classArm.classTeacher?.user
            ? `${classArm.classTeacher?.user?.firstName} ${classArm.classTeacher?.user?.lastName}`
            : '',
        },
        classCaptain: classArm.captain
          ? {
              id: classArm.captain?.id || null,
              name: `${classArm.captain?.user?.firstName} ${classArm.captain?.user?.lastName}`,
              studentNo: classArm.captain?.studentNo || null,
            }
          : null,
        studentsCount: classArm.classArmStudents.length,
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

    // Get current academic session
    const currentSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
    });

    if (!currentSession) {
      throw new Error('No current academic session found');
    }

    // Get classroom details with efficient direct references (filtered by current session)
    const classroom = await this.prisma.classArm.findFirst({
      where: {
        id: classroomId,
        schoolId,
        academicSessionId: currentSession.id,
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
      },
    });

    if (!classroom) {
      throw new Error('Classroom not found or not accessible');
    }

    // Get total count of students in the classroom (filtered by current session)
    const totalStudents = await this.prisma.student.count({
      where: {
        classArmStudents: {
          some: {
            classArmId: classroomId,
            isActive: true,
          },
        },
        deletedAt: null,
      },
    });

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get paginated students with all their data (filtered by current session)
    const paginatedStudents = await this.prisma.student.findMany({
      where: {
        classArmStudents: {
          some: {
            classArmId: classroomId,
            isActive: true,
          },
        },
        deletedAt: null,
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
        assessments: {
          where: { deletedAt: null },
          include: {
            classArmSubject: {
              include: { subject: true },
            },
          },
        },
      },
    });

    // Get all students for population and top performers calculation (without pagination, filtered by current session)
    const allStudents = await this.prisma.student.findMany({
      where: {
        classArmStudents: {
          some: {
            classArmId: classroomId,
            isActive: true,
          },
        },
        deletedAt: null,
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
        assessments: {
          where: { deletedAt: null },
          include: {
            classArmSubject: {
              include: { subject: true },
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
      { totalScore: number; totalMaxScore: number; student: any; latestSubject: string }
    >();

    allStudents.forEach((student) => {
      if (student.assessments.length > 0) {
        const totalScore = student.assessments.reduce((sum, a) => sum + a.score, 0);
        const totalMaxScore = student.assessments.reduce((sum, a) => sum + (a.maxScore || 0), 0);
        const firstSubject = student.assessments[0]?.classArmSubject?.subject?.name || 'N/A';
        performanceMap.set(student.id, {
          totalScore,
          totalMaxScore,
          student,
          latestSubject: firstSubject,
        });
      }
    });

    const topPerformers = Array.from(performanceMap.entries())
      .map(([studentId, data]) => ({
        id: studentId,
        name: `${data.student.user.firstName} ${data.student.user.lastName}`,
        score: data.totalMaxScore > 0 ? Math.round((data.totalScore / data.totalMaxScore) * 100) : 0,
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

    // Return flattened students array
    const students = studentsData;

    return {
      classroom: {
        id: classroom.id,
        name: classroom.name,
        level: (classroom as any).level.name,
        location: (classroom as any).location,
        academicSessionId: classroom.academicSessionId,
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

  async createClassroom(userId: string, createClassroomDto: CreateClassroomDto) {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new BadRequestException('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Get current academic session
    const currentSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
    });

    if (!currentSession) {
      throw new BadRequestException(
        'No current academic session found. Please create an academic session first.',
      );
    }

    // Validate level exists and belongs to the school
    const level = await this.prisma.level.findFirst({
      where: {
        id: createClassroomDto.levelId,
        schoolId,
        deletedAt: null,
      },
    });

    if (!level) {
      throw new BadRequestException('Level not found or does not belong to this school');
    }

    // Check if classroom with same name already exists in the same level and session
    const existingClassroom = await this.prisma.classArm.findFirst({
      where: {
        schoolId,
        levelId: createClassroomDto.levelId,
        academicSessionId: currentSession.id,
        name: {
          equals: createClassroomDto.name,
          mode: 'insensitive',
        },
        deletedAt: null,
      },
    });

    if (existingClassroom) {
      throw new ConflictException(
        `Classroom with name '${createClassroomDto.name}' already exists in ${level.name}`,
      );
    }

    // Validate class teacher if provided
    if (createClassroomDto.classTeacherId) {
      const teacher = await this.prisma.teacher.findFirst({
        where: {
          id: createClassroomDto.classTeacherId,
          deletedAt: null,
          user: {
            schoolId,
          },
        },
      });

      if (!teacher) {
        throw new BadRequestException('Teacher not found or does not belong to this school');
      }
    }

    // Create the classroom (classArm)
    const classroom = await this.prisma.classArm.create({
      data: {
        name: createClassroomDto.name,
        slug: `${createClassroomDto.name.toLowerCase()}-${level.name.toLowerCase()}-${currentSession.academicYear}`,
        levelId: createClassroomDto.levelId,
        academicSessionId: currentSession.id,
        schoolId,
        classTeacherId: createClassroomDto.classTeacherId,
      },
      include: {
        level: true,
        classTeacher: {
          include: {
            user: true,
          },
        },
      },
    });

    // Create ClassArmTeacher record if a teacher was assigned
    if (createClassroomDto.classTeacherId) {
      await this.prisma.classArmTeacher.create({
        data: {
          teacherId: createClassroomDto.classTeacherId,
          classArmId: classroom.id,
        },
      });
    }

    return {
      id: classroom.id,
      name: classroom.name,
      level: classroom.level.name,
      classTeacher: classroom.classTeacher
        ? {
            id: classroom.classTeacher.id,
            name: `${classroom.classTeacher.user.firstName} ${classroom.classTeacher.user.lastName}`,
          }
        : null,
      academicSession: currentSession.academicYear,
      createdAt: classroom.createdAt,
    };
  }

  async getClassroomDetailsByLevelAndArm(
    userId: string,
    level: string,
    classArm: string,
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

    // Get classroom details by level and classArm
    const classroom = await this.prisma.classArm.findFirst({
      where: {
        name: classArm,
        level: {
          name: level,
        },
        schoolId,
        deletedAt: null,
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
      },
    });

    if (!classroom) {
      throw new Error('Classroom not found or not accessible');
    }

    // Get total count of students in the classroom
    const totalStudents = await this.prisma.student.count({
      where: {
        classArmStudents: {
          some: {
            classArm: {
              name: classArm,
              level: {
                name: level,
              },
              schoolId,
              deletedAt: null,
            },
            isActive: true,
          },
        },
      },
    });

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get paginated students with all their data
    // Use the level and class name to find students instead of classroom ID
    const students = await this.prisma.student.findMany({
      where: {
        classArmStudents: {
          some: {
            classArm: {
              name: classArm,
              level: {
                name: level,
              },
              schoolId,
              deletedAt: null,
            },
            isActive: true,
          },
        },
      },
      include: {
        user: true,
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Calculate population statistics
    const maleStudents = students.filter((s) => s.user.gender === 'MALE').length;
    const femaleStudents = students.filter((s) => s.user.gender === 'FEMALE').length;

    // Get attendance data (simplified - you might want to implement proper attendance calculation)
    // TODO: Implement proper attendance calculation
    const attendanceData = {
      totalDays: 180, // Academic year days
      presentDays: 173, // This should be calculated from actual attendance records
      absentDays: 7,
      attendanceRate: 96.11,
      studentsPresent: 0, // Today's attendance
      studentsAbsent: 0,
      totalStudents: totalStudents,
    };

    // Get top performers (simplified - you might want to implement proper performance calculation)
    const topPerformers = [];

    return {
      classroom: {
        id: classroom.id,
        name: classroom.name,
        level: classroom.level.name,
        location: (classroom as any).location,
        academicSessionId: classroom.academicSessionId,
      },
      population: {
        total: totalStudents,
        male: maleStudents,
        female: femaleStudents,
      },
      attendance: attendanceData,
      classTeacher: classroom.classTeacher
        ? {
            id: classroom.classTeacher.id,
            name: `${classroom.classTeacher.user.firstName} ${classroom.classTeacher.user.lastName}`,
            phone: classroom.classTeacher.user.phone || '',
            email: classroom.classTeacher.user.email || '',
          }
        : null,
      classCaptain: classroom.captain
        ? {
            id: classroom.captain.id,
            name: `${classroom.captain.user.firstName} ${classroom.captain.user.lastName}`,
            admissionNumber: classroom.captain.studentNo || '',
          }
        : null,
      students: students.map((student) => ({
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        gender: student.user.gender,
        age: student.user.dateOfBirth
          ? new Date().getFullYear() - new Date(student.user.dateOfBirth).getFullYear()
          : 0,
        admissionNumber: student.studentNo || '',
        guardianPhone: student.user.phone || '',
        guardianName: '', // Add default values for missing fields
        stateOfOrigin: student.user.stateOfOrigin || 'N/A', // Use actual state of origin
      })),
      topPerformers,
    };
  }

  async getClassroomDetailsDataBySlug(
    userId: string,
    slug: string,
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

    // Get current academic session
    const currentSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
    });

    if (!currentSession) {
      throw new Error('No current academic session found');
    }

    // Get classroom details by slug (filtered by current session)
    const classroom = await this.prisma.classArm.findFirst({
      where: {
        slug: slug,
        schoolId,
        academicSessionId: currentSession.id,
      },
      include: {
        level: true,
        academicSession: true,
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
      },
    });

    if (!classroom) {
      throw new Error('Classroom not found or not accessible');
    }

    // Get total count of students in the classroom (filtered by current session)
    // const totalStudents = await this.prisma.student.count({
    //   where: {
    //     classArmStudents: {
    //       some: {
    //         classArmId: classroom.id,
    //         isActive: true,
    //       },
    //     },
    //     deletedAt: null,
    //   },
    // });

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get paginated students with all their data (filtered by current session)
    const paginatedStudents = await this.prisma.student.findMany({
      where: {
        classArmStudents: {
          some: {
            classArmId: classroom.id,
            isActive: true,
          },
        },
        deletedAt: null,
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
        assessments: {
          where: { deletedAt: null },
          include: {
            classArmSubject: {
              include: { subject: true },
            },
          },
        },
      },
    });

    // Get all students for population and top performers calculation (without pagination, filtered by current session)
    const allStudents = await this.prisma.student.findMany({
      where: {
        classArmStudents: {
          some: {
            classArmId: classroom.id,
            isActive: true,
          },
        },
        deletedAt: null,
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
        assessments: {
          where: { deletedAt: null },
          include: {
            classArmSubject: {
              include: { subject: true },
            },
          },
        },
      },
    });

    // Calculate population statistics
    const maleStudents = allStudents.filter((student) => student.user.gender === 'MALE').length;
    const femaleStudents = allStudents.filter((student) => student.user.gender === 'FEMALE').length;

    // Calculate top performers (only include students with assessment data)
    const topPerformers = allStudents
      .filter((student) => student.assessments.length > 0)
      .map((student) => {
        const totalScore = student.assessments.reduce((sum, a) => sum + a.score, 0);
        const totalMaxScore = student.assessments.reduce((sum, a) => sum + (a.maxScore || 0), 0);
        const totalPercentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

        return {
          id: student.id,
          name: `${student.user.firstName} ${student.user.lastName}`,
          score: Math.round(totalPercentage),
          subject: student.assessments[0]?.classArmSubject?.subject?.name || 'N/A',
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      classroom: {
        id: classroom.id,
        name: classroom.name,
        level: classroom.level.name,
        location: classroom.location,
        academicSessionId: classroom.academicSession.id,
      },
      population: {
        total: allStudents.length,
        male: maleStudents,
        female: femaleStudents,
      },
      attendance: {
        totalDays: 0, // Placeholder
        presentDays: 0, // Placeholder
        absentDays: 0, // Placeholder
        attendanceRate: 0, // Placeholder
        studentsPresent: 0, // Placeholder
        studentsAbsent: 0, // Placeholder
        totalStudents: allStudents.length,
      },
      classTeacher: classroom.classTeacher
        ? {
            id: classroom.classTeacher.id,
            name: `${classroom.classTeacher.user.firstName} ${classroom.classTeacher.user.lastName}`,
            phone: classroom.classTeacher.user.phone,
            email: classroom.classTeacher.user.email,
          }
        : null,
      classCaptain: classroom.captain
        ? {
            id: classroom.captain.id,
            name: `${classroom.captain.user.firstName} ${classroom.captain.user.lastName}`,
            admissionNumber: classroom.captain.studentNo,
          }
        : null,
      students: paginatedStudents.map((student) => ({
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        gender: student.user.gender,
        age: student.user.dateOfBirth
          ? new Date().getFullYear() - new Date(student.user.dateOfBirth).getFullYear()
          : 0,
        admissionNumber: student.studentNo,
        guardianPhone: student.guardian?.user.phone || null,
        guardianName: student.guardian
          ? `${student.guardian.user.firstName} ${student.guardian.user.lastName}`
          : '',
        stateOfOrigin: student.user.stateOfOrigin || 'Not provided',
      })),
      topPerformers: topPerformers,
    };
  }

  async getTopClassChampions(userId: string): Promise<TopClassChampionsData> {
    // Get user's school ID
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
      return {
        champions: [],
        academicSession: 'No active session',
        term: 'No active term',
      };
    }

    // Get current term
    const currentTerm = await this.prisma.term.findFirst({
      where: { academicSessionId: currentSession.id },
      orderBy: { createdAt: 'desc' },
    });

    // Get all class arms with students, assessments, class teacher, and level
    const classArms = await this.prisma.classArm.findMany({
      where: {
        schoolId,
        academicSessionId: currentSession.id,
        deletedAt: null,
      },
      include: {
        level: true,
        classTeacher: {
          include: {
            user: true,
          },
        },
        classArmStudents: {
          where: { isActive: true },
          include: {
            student: {
              include: {
                user: true,
                assessments: {
                  where: { deletedAt: null },
                },
              },
            },
          },
        },
      },
    });

    // For each class arm, find the top-performing student
    const champions = classArms
      .map((classArm) => {
        const studentsWithScores = classArm.classArmStudents
          .filter((cas) => cas.student.assessments.length > 0)
          .map((cas) => {
            const totalScore = cas.student.assessments.reduce((sum, a) => sum + a.score, 0);
            const totalMaxScore = cas.student.assessments.reduce(
              (sum, a) => sum + (a.maxScore || 0),
              0,
            );
            const totalPercentage =
              totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

            return {
              id: cas.student.id,
              name: `${cas.student.user.firstName} ${cas.student.user.lastName}`,
              score: Math.round(totalPercentage),
              className: classArm.name,
              classLevel: classArm.level.name,
              teacherName: classArm.classTeacher
                ? `${classArm.classTeacher.user.firstName} ${classArm.classTeacher.user.lastName}`
                : 'No teacher assigned',
              avatarUrl: cas.student.user.avatarUrl || null,
            };
          })
          .sort((a, b) => b.score - a.score);

        return studentsWithScores[0] || null;
      })
      .filter((champion): champion is NonNullable<typeof champion> => champion !== null)
      .sort((a, b) => b.score - a.score);

    return {
      champions,
      academicSession: currentSession.academicYear,
      term: currentTerm?.name || 'No active term',
    };
  }
}
