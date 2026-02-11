import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../prisma';
import { PaginatedStudentDetails, SingleStudentDetails, StudentsViewData } from '../types';

@Injectable()
export class BffAdminStudentService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentDetailsData(
    userId: string,
    page: number = 1,
    limit: number = 20,
    classroomId?: string,
    search?: string,
    academicSessionId?: string,
  ): Promise<PaginatedStudentDetails> {
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

    // Build where clause for filtering
    const whereClause: any = {
      user: {
        schoolId,
      },
    };

    // Add classroom filter if provided
    if (classroomId) {
      whereClause.classArmId = classroomId;
    }

    // Add search filter if provided
    if (search) {
      whereClause.OR = [
        {
          user: {
            firstName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          user: {
            lastName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          admissionNo: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          studentNo: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Get total count
    const totalStudents = await this.prisma.student.count({
      where: whereClause,
    });

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(totalStudents / limit);

    // Get paginated students with all necessary data
    const students = await this.prisma.student.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        user: {
          include: {
            address: true,
          },
        },
        guardian: {
          include: {
            user: true,
          },
        },
        classArmStudents: {
          where: { isActive: true },
          include: {
            classArm: {
              include: {
                level: true,
              },
            },
            studentAttendances: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 30, // Last 30 attendance records for rate calculation
            },
          },
        },
        assessments: {
          where: { deletedAt: null },
        },
      },
      orderBy: [
        {
          user: {
            firstName: 'asc',
          },
        },
        {
          user: {
            lastName: 'asc',
          },
        },
      ],
    });

    // Process student data
    const studentsData = students.map((student) => {
      // Calculate age
      const age = student.user.dateOfBirth
        ? Math.floor(
            (new Date().getTime() - new Date(student.user.dateOfBirth).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000),
          )
        : 0;

      // Calculate average grade from assessments
      const allScores = student.assessments.map((a) => a.score);
      const averageGrade =
        allScores.length > 0
          ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
          : 0;

      // Calculate attendance rate
      const allAttendances = student.classArmStudents.flatMap(cas => cas.studentAttendances);
      const presentCount = allAttendances.filter(
        (attendance) => attendance.status === 'PRESENT',
      ).length;
      const totalAttendanceRecords = allAttendances.length;
      const attendanceRate =
        totalAttendanceRecords > 0 ? (presentCount / totalAttendanceRecords) * 100 : 0;

      // Simulate current presence (random for demo purposes)
      const isPresent = Math.random() > 0.1; // 90% chance of being present

      // Get guardian info
      const guardianName = student.guardian
        ? `${student.guardian.user.firstName} ${student.guardian.user.lastName}`
        : 'N/A';

      const guardianPhone = student.guardian?.user.phone || null;

      return {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        studentId: student.studentNo,
        admissionNumber: student.admissionNo || 'N/A',
        gender: student.user.gender === 'MALE' ? 'Male' : 'Female',
        age,
        stateOfOrigin: student.user.stateOfOrigin || 'N/A',
        guardianName,
        guardianPhone,
        telephone: student.user.phone,
        className:
          student.classArmStudents?.[0]?.classArm &&
          student.classArmStudents[0].classArm.academicSessionId === targetSession.id &&
          !student.classArmStudents[0].classArm.deletedAt
            ? student.classArmStudents[0].classArm.name
            : 'Not assigned',
        classLevel:
          student.classArmStudents?.[0]?.classArm &&
          student.classArmStudents[0].classArm.academicSessionId === targetSession.id &&
          !student.classArmStudents[0].classArm.deletedAt
            ? student.classArmStudents[0].classArm.level.name
            : 'Not assigned',
        averageGrade: Math.round(averageGrade * 100) / 100,
        isPresent,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        avatarUrl: student.user.avatarUrl,
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

    return {
      students: studentsData,
      pagination: paginationInfo,
    };
  }

  async getSingleStudentDetails(userId: string, studentId: string): Promise<SingleStudentDetails> {
    // First, get the user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not found or not associated with a school');
    }

    const schoolId = user.schoolId;

    // Get the specific student with all necessary data
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        user: {
          schoolId,
        },
      },
      include: {
        user: {
          include: {
            address: true,
          },
        },
        guardian: {
          include: {
            user: true,
          },
        },
        classArmStudents: {
          where: { isActive: true },
          include: {
            classArm: {
              include: {
                level: true,
              },
            },
            studentAttendances: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 30, // Last 30 attendance records for rate calculation
            },
          },
        },
        assessments: {
          where: { deletedAt: null },
        },
      },
    });

    if (!student) {
      throw new Error('Student not found or not accessible');
    }

    // Calculate age
    const age = student.user.dateOfBirth
      ? Math.floor(
          (new Date().getTime() - new Date(student.user.dateOfBirth).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        )
      : 0;

    // Calculate average grade from assessments
    const allScores = student.assessments.map((a) => a.score);
    const averageGrade =
      allScores.length > 0
        ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
        : 0;

    // Calculate attendance rate
    const allAttendances = student.classArmStudents.flatMap(cas => cas.studentAttendances);
    const presentCount = allAttendances.filter(
      (attendance) => attendance.status === 'PRESENT',
    ).length;
    const totalAttendanceRecords = allAttendances.length;
    const attendanceRate =
      totalAttendanceRecords > 0 ? (presentCount / totalAttendanceRecords) * 100 : 0;

    // Simulate current presence (random for demo purposes)
    const isPresent = Math.random() > 0.1; // 90% chance of being present

    // Get guardian info
    const guardianName = student.guardian
      ? `${student.guardian.user.firstName} ${student.guardian.user.lastName}`
      : 'N/A';

    const guardianPhone = student.guardian?.user.phone || null;

    return {
      id: student.id,
      name: `${student.user.firstName} ${student.user.lastName}`,
      studentId: student.studentNo,
      admissionNumber: student.admissionNo || 'N/A',
      gender: student.user.gender === 'MALE' ? 'Male' : 'Female',
      age,
      stateOfOrigin: student.user.stateOfOrigin || 'N/A',
      guardianName,
      guardianPhone,
      telephone: student.user.phone,
      className: student.classArmStudents?.[0]?.classArm ? student.classArmStudents[0].classArm.name : 'N/A',
      classLevel: student.classArmStudents?.[0]?.classArm?.level ? student.classArmStudents[0].classArm.level.name : 'N/A',
      averageGrade: Math.round(averageGrade * 100) / 100,
      isPresent,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      avatarUrl: student.user.avatarUrl,
    };
  }

  async getStudentsViewData(userId: string, academicSessionId?: string): Promise<StudentsViewData> {
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
      // Return empty data for new schools without academic sessions
      return {
        stats: {
          totalStudents: 0,
          maleStudents: 0,
          femaleStudents: 0,
          graduatedStudents: 0,
          attendanceToday: {
            present: 0,
            absent: 0,
            presentPercentage: 0,
            absentPercentage: 0,
          },
          statusBreakdown: {
            active: 0,
            inactive: 0,
            suspended: 0,
          },
        },
        students: [],
      };
    }

    // Get all students for the school (not filtered by class arm assignment)
    const students = await this.prisma.student.findMany({
      where: {
        user: {
          schoolId,
        },
        deletedAt: null,
      },
      include: {
        user: true,
        guardian: {
          include: {
            user: true,
          },
        },
        classArmStudents: {
          where: { isActive: true },
          include: {
            classArm: {
              include: {
                level: true,
                academicSession: true,
              },
            },
            studentAttendances: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 30, // Last 30 attendance records for rate calculation
            },
          },
        },
        assessments: {
          where: {
            deletedAt: null,
            classArmSubject: {
              classArm: {
                academicSessionId: targetSession.id,
              },
            },
          },
        },
      },
    });

    // Calculate statistics
    const totalStudents = students.length;
    const maleStudents = students.filter((student) => student.user.gender === 'MALE').length;
    const femaleStudents = students.filter((student) => student.user.gender === 'FEMALE').length;

    // Calculate graduated students (students in final year/class)
    // This is a simplified calculation - you might want to adjust based on your logic
    const graduatedStudents = students.filter((student) => {
      // Assuming final year is the highest level
      const levels = students.map((s) => s.classArmStudents?.[0]?.classArm?.level?.name).filter(Boolean);
      const maxLevel = Math.max(
        ...levels.map((level) => parseInt(level?.replace(/\D/g, '') || '0')),
      );
      return student.classArmStudents?.[0]?.classArm?.level?.name?.includes(maxLevel.toString());
    }).length;

    // Calculate attendance today (simulated for now)
    const studentsPresent = Math.floor(totalStudents * (0.9 + Math.random() * 0.08)); // 90-98% present
    const studentsAbsent = totalStudents - studentsPresent;
    const presentPercentage = totalStudents > 0 ? studentsPresent / totalStudents : 0;
    const absentPercentage = totalStudents > 0 ? studentsAbsent / totalStudents : 0;

    // Calculate status breakdown (simplified)
    const activeStudents = Math.floor(totalStudents * 0.95); // 95% active
    const inactiveStudents = Math.floor(totalStudents * 0.03); // 3% inactive
    const suspendedStudents = totalStudents - activeStudents - inactiveStudents;

    // Transform students data for the response
    const studentsData = students.map((student) => ({
      id: student.id,
      name: `${student.user.firstName} ${student.user.lastName}`,
      studentId: student.studentNo,
      admissionNumber: student.admissionNo || student.studentNo,
      gender: student.user.gender,
      age: student.user.dateOfBirth
        ? Math.floor(
            (Date.now() - new Date(student.user.dateOfBirth).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000),
          )
        : 0,
      stateOfOrigin: student.user.stateOfOrigin || 'Unknown',
      // Use new guardian fields on student, fallback to old guardian relation
      guardianName:
        student.guardianFirstName && student.guardianLastName
          ? `${student.guardianFirstName} ${student.guardianLastName}`
          : student.guardian?.user
            ? `${student.guardian.user.firstName} ${student.guardian.user.lastName}`
            : 'N/A',
      guardianEmail: student.guardianEmail || student.guardian?.user?.email || null,
      guardianPhone: student.guardianPhone || student.guardian?.user?.phone || 'N/A',
      telephone: student.user.phone || 'N/A',
      email: student.user.email || null,
      dateAdmitted: student.admissionDate?.toISOString() || null,
      className: student.classArmStudents?.[0]?.classArm?.name || 'N/A',
      classLevel: student.classArmStudents?.[0]?.classArm?.level?.name || 'N/A',
      averageGrade: 0, // This would need to be calculated from actual grades
      isPresent: Math.random() > 0.1, // Simulated attendance
      attendanceRate: Math.floor(Math.random() * 40) + 60, // 60-100% attendance rate
      avatarUrl: student.user.avatarUrl || null,
      address: student.address || null,
      medicalInformation: student.medicalInformation || null,
    }));

    return {
      stats: {
        totalStudents,
        maleStudents,
        femaleStudents,
        graduatedStudents,
        attendanceToday: {
          present: studentsPresent,
          absent: studentsAbsent,
          presentPercentage: Math.round(presentPercentage * 100) / 100,
          absentPercentage: Math.round(absentPercentage * 100) / 100,
        },
        statusBreakdown: {
          active: activeStudents,
          inactive: inactiveStudents,
          suspended: suspendedStudents,
        },
      },
      students: studentsData,
    };
  }

  private async getStudentsForSchool(
    schoolId: string,
    targetSession: any,
  ): Promise<StudentsViewData> {
    // Get all students for the school (not filtered by class arm assignment)
    const students = await this.prisma.student.findMany({
      where: {
        user: {
          schoolId,
        },
        deletedAt: null,
      },
      include: {
        user: true,
        guardian: {
          include: {
            user: true,
          },
        },
        classArmStudents: {
          where: { isActive: true },
          include: {
            classArm: {
              include: {
                level: true,
                academicSession: true,
              },
            },
            studentAttendances: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 30, // Last 30 attendance records for rate calculation
            },
          },
        },
        assessments: {
          where: {
            deletedAt: null,
            classArmSubject: {
              classArm: {
                academicSessionId: targetSession.id,
              },
            },
          },
        },
      },
    });

    // Calculate statistics
    const totalStudents = students.length;
    const maleStudents = students.filter((student) => student.user.gender === 'MALE').length;
    const femaleStudents = students.filter((student) => student.user.gender === 'FEMALE').length;

    // Calculate graduated students (students in final year/class)
    // This is a simplified calculation - you might want to adjust based on your logic
    const graduatedStudents = students.filter((student) => {
      // Assuming final year is the highest level
      const levels = students.map((s) => s.classArmStudents?.[0]?.classArm?.level?.name).filter(Boolean);
      const maxLevel = Math.max(
        ...levels.map((level) => parseInt(level?.replace(/\D/g, '') || '0')),
      );
      return student.classArmStudents?.[0]?.classArm?.level?.name?.includes(maxLevel.toString());
    }).length;

    // Calculate attendance today (simulated for now)
    const studentsPresent = Math.floor(totalStudents * (0.9 + Math.random() * 0.08)); // 90-98% present
    const studentsAbsent = totalStudents - studentsPresent;
    const presentPercentage = totalStudents > 0 ? (studentsPresent / totalStudents) * 100 : 0;
    const absentPercentage = totalStudents > 0 ? (studentsAbsent / totalStudents) * 100 : 0;

    // Calculate status breakdown (simulated for now)
    // In a real implementation, you'd have status fields in your database
    const activeStudents = Math.floor(totalStudents * 0.95); // 95% active
    const inactiveStudents = Math.floor(totalStudents * 0.03); // 3% inactive
    const suspendedStudents = totalStudents - activeStudents - inactiveStudents; // 2% suspended

    // Process student data for the list
    const studentsData = students.map((student) => {
      // Calculate age
      const age = student.user.dateOfBirth
        ? Math.floor(
            (new Date().getTime() - new Date(student.user.dateOfBirth).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000),
          )
        : 0;

      // Calculate average grade from assessments
      const allScores = student.assessments.map((a) => a.score);
      const averageGrade =
        allScores.length > 0
          ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
          : 0;

      // Calculate attendance rate
      const allAttendances = student.classArmStudents.flatMap(cas => cas.studentAttendances);
      const presentCount = allAttendances.filter(
        (attendance) => attendance.status === 'PRESENT',
      ).length;
      const totalAttendanceRecords = allAttendances.length;
      const attendanceRate =
        totalAttendanceRecords > 0 ? (presentCount / totalAttendanceRecords) * 100 : 0;

      // Simulate current presence
      const isPresent = Math.random() > 0.1; // 90% chance of being present

      // Get guardian info
      const guardianName = student.guardian
        ? `${student.guardian.user.firstName} ${student.guardian.user.lastName}`
        : 'N/A';

      const guardianPhone = student.guardian?.user.phone || null;

      return {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        studentId: student.studentNo,
        admissionNumber: student.admissionNo || 'N/A',
        gender: student.user.gender === 'MALE' ? 'Male' : 'Female',
        age,
        stateOfOrigin: student.user.stateOfOrigin || 'N/A',
        guardianName,
        guardianPhone,
        telephone: student.user.phone,
        className:
          student.classArmStudents?.[0]?.classArm &&
          student.classArmStudents[0].classArm.academicSessionId === targetSession.id &&
          !student.classArmStudents[0].classArm.deletedAt
            ? student.classArmStudents[0].classArm.name
            : 'Not assigned',
        classLevel:
          student.classArmStudents?.[0]?.classArm &&
          student.classArmStudents[0].classArm.academicSessionId === targetSession.id &&
          !student.classArmStudents[0].classArm.deletedAt
            ? student.classArmStudents[0].classArm.level.name
            : 'Not assigned',
        averageGrade: Math.round(averageGrade * 100) / 100,
        isPresent,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        avatarUrl: student.user.avatarUrl,
      };
    });

    return {
      stats: {
        totalStudents,
        maleStudents,
        femaleStudents,
        graduatedStudents,
        attendanceToday: {
          present: studentsPresent,
          absent: studentsAbsent,
          presentPercentage: Math.round(presentPercentage * 100) / 100,
          absentPercentage: Math.round(absentPercentage * 100) / 100,
        },
        statusBreakdown: {
          active: activeStudents,
          inactive: inactiveStudents,
          suspended: suspendedStudents,
        },
      },
      students: studentsData,
    };
  }
}
