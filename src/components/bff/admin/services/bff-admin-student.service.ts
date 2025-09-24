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
        classArm: {
          include: {
            level: true,
          },
        },
        subjectTermStudents: {
          include: {
            assessments: true,
          },
        },
        studentAttendances: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 30, // Last 30 attendance records for rate calculation
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
      const allScores = student.subjectTermStudents.flatMap((sts) =>
        sts.assessments.map((assessment) => assessment.score),
      );
      const averageGrade =
        allScores.length > 0
          ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
          : 0;

      // Calculate attendance rate
      const presentCount = student.studentAttendances.filter(
        (attendance) => attendance.status === 'PRESENT',
      ).length;
      const totalAttendanceRecords = student.studentAttendances.length;
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
          student.classArm &&
          student.classArm.academicSessionId === targetSession.id &&
          !student.classArm.deletedAt
            ? student.classArm.name
            : 'Not assigned',
        classLevel:
          student.classArm &&
          student.classArm.academicSessionId === targetSession.id &&
          !student.classArm.deletedAt
            ? student.classArm.level.name
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
        classArm: {
          include: {
            level: true,
          },
        },
        subjectTermStudents: {
          include: {
            assessments: true,
          },
        },
        studentAttendances: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 30, // Last 30 attendance records for rate calculation
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
    const allScores = student.subjectTermStudents.flatMap((sts) =>
      sts.assessments.map((assessment) => assessment.score),
    );
    const averageGrade =
      allScores.length > 0
        ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
        : 0;

    // Calculate attendance rate
    const presentCount = student.studentAttendances.filter(
      (attendance) => attendance.status === 'PRESENT',
    ).length;
    const totalAttendanceRecords = student.studentAttendances.length;
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
      className: student.classArm ? student.classArm.name : 'N/A',
      classLevel: student.classArm?.level ? student.classArm.level.name : 'N/A',
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
        classArm: {
          include: {
            level: true,
            academicSession: true,
          },
        },
        subjectTermStudents: {
          where: {
            subjectTerm: {
              academicSessionId: targetSession.id,
            },
          },
          include: {
            assessments: true,
          },
        },
        studentAttendances: {
          where: {
            academicSessionId: targetSession.id,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 30, // Last 30 attendance records for rate calculation
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
      const levels = students.map((s) => s.classArm?.level?.name).filter(Boolean);
      const maxLevel = Math.max(
        ...levels.map((level) => parseInt(level?.replace(/\D/g, '') || '0')),
      );
      return student.classArm?.level?.name?.includes(maxLevel.toString());
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
      const allScores = student.subjectTermStudents.flatMap((sts) =>
        sts.assessments.map((assessment) => assessment.score),
      );
      const averageGrade =
        allScores.length > 0
          ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
          : 0;

      // Calculate attendance rate
      const presentCount = student.studentAttendances.filter(
        (attendance) => attendance.status === 'PRESENT',
      ).length;
      const totalAttendanceRecords = student.studentAttendances.length;
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
          student.classArm &&
          student.classArm.academicSessionId === targetSession.id &&
          !student.classArm.deletedAt
            ? student.classArm.name
            : 'Not assigned',
        classLevel:
          student.classArm &&
          student.classArm.academicSessionId === targetSession.id &&
          !student.classArm.deletedAt
            ? student.classArm.level.name
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
