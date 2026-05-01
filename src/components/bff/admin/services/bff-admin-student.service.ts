import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../prisma';
import { CurrentTermService } from '../../../../shared/services/current-term.service';
import { PaginatedStudentDetails, SingleStudentDetails, StudentsViewData } from '../types';

@Injectable()
export class BffAdminStudentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currentTermService: CurrentTermService,
  ) {}

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
    let targetSession;
    if (academicSessionId) {
      targetSession = await this.prisma.academicSession.findFirst({
        where: { id: academicSessionId, schoolId },
      });
    } else {
      const current = await this.currentTermService.getCurrentTermWithSession(schoolId);
      targetSession = current?.session ?? null;
    }

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
      const allAttendances = student.classArmStudents.flatMap((cas) => cas.studentAttendances);
      const presentCount = allAttendances.filter(
        (attendance) => attendance.status === 'PRESENT',
      ).length;
      const totalAttendanceRecords = allAttendances.length;
      const attendanceRate =
        totalAttendanceRecords > 0 ? (presentCount / totalAttendanceRecords) * 100 : 0;

      // Simulate current presence (random for demo purposes)
      const isPresent = Math.random() > 0.1; // 90% chance of being present

      // Get guardian info - fall back to inline fields on student
      const guardianName =
        student.guardianFirstName || student.guardianLastName
          ? `${student.guardianFirstName || ''} ${student.guardianLastName || ''}`.trim()
          : student.guardian
            ? `${student.guardian.user.firstName} ${student.guardian.user.lastName}`
            : 'N/A';

      const guardianPhone = student.guardianPhone || student.guardian?.user?.phone || null;

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
        guardianEmail: student.guardianEmail || student.guardian?.user?.email || null,
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
    const allAttendances = student.classArmStudents.flatMap((cas) => cas.studentAttendances);
    const presentCount = allAttendances.filter(
      (attendance) => attendance.status === 'PRESENT',
    ).length;
    const totalAttendanceRecords = allAttendances.length;
    const attendanceRate =
      totalAttendanceRecords > 0 ? (presentCount / totalAttendanceRecords) * 100 : 0;

    // Simulate current presence (random for demo purposes)
    const isPresent = Math.random() > 0.1; // 90% chance of being present

    // Get guardian info - fall back to inline fields on student
    const guardianName =
      student.guardianFirstName || student.guardianLastName
        ? `${student.guardianFirstName || ''} ${student.guardianLastName || ''}`.trim()
        : student.guardian
          ? `${student.guardian.user.firstName} ${student.guardian.user.lastName}`
          : 'N/A';

    const guardianPhone = student.guardianPhone || student.guardian?.user?.phone || null;

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
      guardianEmail: student.guardianEmail || student.guardian?.user?.email || null,
      telephone: student.user.phone,
      className: student.classArmStudents?.[0]?.classArm
        ? student.classArmStudents[0].classArm.name
        : 'N/A',
      classLevel: student.classArmStudents?.[0]?.classArm?.level
        ? student.classArmStudents[0].classArm.level.name
        : 'N/A',
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
    let targetSession;
    if (academicSessionId) {
      targetSession = await this.prisma.academicSession.findFirst({
        where: { id: academicSessionId, schoolId },
      });
    } else {
      const current = await this.currentTermService.getCurrentTermWithSession(schoolId);
      targetSession = current?.session ?? null;
    }

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
                department: true,
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

    // Status counts come from Student.status, the canonical field that
    // admins flip when they explicitly graduate / suspend / deactivate a
    // student. The previous implementation faked these (random ratios for
    // active/inactive/suspended; a substring match against the highest-
    // numbered level for graduated), which produced non-zero graduate
    // counts for any school with students enrolled in their senior class —
    // including schools that had never graduated anyone.
    const [activeStudents, inactiveStudents, suspendedStudents, graduatedStudents] =
      await Promise.all([
        this.prisma.student.count({
          where: { user: { schoolId }, status: 'ACTIVE' },
        }),
        this.prisma.student.count({
          where: { user: { schoolId }, status: 'INACTIVE' },
        }),
        this.prisma.student.count({
          where: { user: { schoolId }, status: 'SUSPENDED' },
        }),
        this.prisma.student.count({
          where: { user: { schoolId }, status: 'GRADUATED' },
        }),
      ]);

    // Today's attendance: real records keyed by classArmStudent for the
    // current day. PRESENT/LATE both count as attended; ABSENT counts as
    // absent. EXCUSED and "no record yet" are uncounted, so present + absent
    // ≤ totalStudents (the card will read 0/0 if attendance hasn't been
    // taken today, which is accurate).
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999,
    );
    const todaysAttendances = await this.prisma.studentAttendance.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        deletedAt: null,
        classArmStudent: { student: { user: { schoolId } } },
      },
      select: { classArmStudentId: true, status: true },
    });
    const presentClassArmStudentIds = new Set(
      todaysAttendances
        .filter((a) => a.status === 'PRESENT' || a.status === 'LATE')
        .map((a) => a.classArmStudentId),
    );
    const studentsPresent = presentClassArmStudentIds.size;
    const studentsAbsent = todaysAttendances.filter((a) => a.status === 'ABSENT').length;
    const presentPercentage = totalStudents > 0 ? studentsPresent / totalStudents : 0;
    const absentPercentage = totalStudents > 0 ? studentsAbsent / totalStudents : 0;

    // Transform students data for the response
    const studentsData = students.map((student) => {
      // Real attendance rate from the last 30 records already pulled in the
      // include above. Same definition used elsewhere: PRESENT or LATE
      // counts as attended.
      const allAttendances = student.classArmStudents.flatMap((cas) => cas.studentAttendances);
      const attendedCount = allAttendances.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE',
      ).length;
      const attendanceRate =
        allAttendances.length > 0 ? (attendedCount / allAttendances.length) * 100 : 0;
      const isPresent = student.classArmStudents.some((cas) =>
        presentClassArmStudentIds.has(cas.id),
      );

      return {
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
        departmentName: student.classArmStudents?.[0]?.classArm?.department?.name || null,
        averageGrade: 0, // This would need to be calculated from actual grades
        isPresent,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        avatarUrl: student.user.avatarUrl || null,
        address: student.address || null,
        medicalInformation: student.medicalInformation || null,
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
                department: true,
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

    // Status counts from Student.status (see getStudentsViewData for the
    // rationale — same fix applied here for parity).
    const [activeStudents, inactiveStudents, suspendedStudents, graduatedStudents] =
      await Promise.all([
        this.prisma.student.count({
          where: { user: { schoolId }, status: 'ACTIVE' },
        }),
        this.prisma.student.count({
          where: { user: { schoolId }, status: 'INACTIVE' },
        }),
        this.prisma.student.count({
          where: { user: { schoolId }, status: 'SUSPENDED' },
        }),
        this.prisma.student.count({
          where: { user: { schoolId }, status: 'GRADUATED' },
        }),
      ]);

    // Today's attendance from real records.
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999,
    );
    const todaysAttendances = await this.prisma.studentAttendance.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        deletedAt: null,
        classArmStudent: { student: { user: { schoolId } } },
      },
      select: { classArmStudentId: true, status: true },
    });
    const presentClassArmStudentIds = new Set(
      todaysAttendances
        .filter((a) => a.status === 'PRESENT' || a.status === 'LATE')
        .map((a) => a.classArmStudentId),
    );
    const studentsPresent = presentClassArmStudentIds.size;
    const studentsAbsent = todaysAttendances.filter((a) => a.status === 'ABSENT').length;
    const presentPercentage = totalStudents > 0 ? (studentsPresent / totalStudents) * 100 : 0;
    const absentPercentage = totalStudents > 0 ? (studentsAbsent / totalStudents) * 100 : 0;

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

      // Real attendance rate from the last 30 records pulled in the include.
      // PRESENT or LATE both count as attended.
      const allAttendances = student.classArmStudents.flatMap((cas) => cas.studentAttendances);
      const attendedCount = allAttendances.filter(
        (attendance) => attendance.status === 'PRESENT' || attendance.status === 'LATE',
      ).length;
      const totalAttendanceRecords = allAttendances.length;
      const attendanceRate =
        totalAttendanceRecords > 0 ? (attendedCount / totalAttendanceRecords) * 100 : 0;

      // Real "is the student in school today" — based on today's attendance set.
      const isPresent = student.classArmStudents.some((cas) =>
        presentClassArmStudentIds.has(cas.id),
      );

      // Get guardian info - fall back to inline fields on student
      const guardianName =
        student.guardianFirstName || student.guardianLastName
          ? `${student.guardianFirstName || ''} ${student.guardianLastName || ''}`.trim()
          : student.guardian
            ? `${student.guardian.user.firstName} ${student.guardian.user.lastName}`
            : 'N/A';

      const guardianPhone = student.guardianPhone || student.guardian?.user?.phone || null;

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
        guardianEmail: student.guardianEmail || student.guardian?.user?.email || null,
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
