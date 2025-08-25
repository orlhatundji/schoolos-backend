import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../prisma';
import { PaginatedStudentDetails, SingleStudentDetails } from '../types';

@Injectable()
export class BffAdminStudentService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentDetailsData(
    userId: string,
    page: number = 1,
    limit: number = 20,
    classroomId?: string,
    search?: string,
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
        className: student.classArm ? student.classArm.name : 'N/A',
        classLevel: student.classArm?.level ? student.classArm.level.name : 'N/A',
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
}
