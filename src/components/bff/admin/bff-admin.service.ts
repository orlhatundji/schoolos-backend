import { Injectable } from '@nestjs/common';

import { ActivityLogService } from '../../../common/services/activity-log.service';
import { PrismaService } from '../../../prisma';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateLevelDto } from './dto/create-level.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { BffAdminAdminService } from './services/bff-admin-admin.service';
import { BffAdminClassroomService } from './services/bff-admin-classroom.service';
import { BffAdminDepartmentService } from './services/bff-admin-department.service';
import { BffAdminLevelService } from './services/bff-admin-level.service';
import { BffAdminStudentService } from './services/bff-admin-student.service';
import { BffAdminSubjectService } from './services/bff-admin-subject.service';
import { BffAdminTeacherService } from './services/bff-admin-teacher.service';
import {
  AdminClassroomsViewData,
  AdminsViewData,
  ClassroomDetailsData,
  DashboardSummaryData,
  DepartmentsViewData,
  LevelsViewData,
  PaginatedStudentDetails,
  SingleStudentDetails,
  SingleTeacherDetails,
  StudentsViewData,
  SubjectsViewData,
  TeachersViewData,
} from './types';

@Injectable()
export class BffAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
    private readonly teacherService: BffAdminTeacherService,
    private readonly studentService: BffAdminStudentService,
    private readonly classroomService: BffAdminClassroomService,
    private readonly subjectService: BffAdminSubjectService,
    private readonly departmentService: BffAdminDepartmentService,
    private readonly levelService: BffAdminLevelService,
    private readonly adminService: BffAdminAdminService,
  ) {}

  async getClassroomsViewData(userId: string): Promise<AdminClassroomsViewData> {
    return this.classroomService.getClassroomsViewData(userId);
  }

  async getClassroomDetailsData(
    userId: string,
    classroomId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<ClassroomDetailsData> {
    return this.classroomService.getClassroomDetailsData(userId, classroomId, page, limit);
  }

  async getClassroomDetailsDataBySlug(
    userId: string,
    slug: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<ClassroomDetailsData> {
    return this.classroomService.getClassroomDetailsDataBySlug(userId, slug, page, limit);
  }

  async getStudentDetailsData(
    userId: string,
    page: number = 1,
    limit: number = 20,
    classroomId?: string,
    search?: string,
  ): Promise<PaginatedStudentDetails> {
    return this.studentService.getStudentDetailsData(userId, page, limit, classroomId, search);
  }

  async getSingleStudentDetails(userId: string, studentId: string): Promise<SingleStudentDetails> {
    return this.studentService.getSingleStudentDetails(userId, studentId);
  }

  async getTeachersViewData(userId: string, academicSessionId?: string): Promise<TeachersViewData> {
    return this.teacherService.getTeachersViewData(userId, academicSessionId);
  }

  async getSingleTeacherDetails(userId: string, teacherId: string): Promise<SingleTeacherDetails> {
    return this.teacherService.getSingleTeacherDetails(userId, teacherId);
  }

  async getStudentsViewData(userId: string, academicSessionId?: string): Promise<StudentsViewData> {
    return this.studentService.getStudentsViewData(userId, academicSessionId);
  }

  async getSubjectsViewData(userId: string): Promise<SubjectsViewData> {
    return this.subjectService.getSubjectsViewData(userId);
  }

  async createSubject(userId: string, createSubjectDto: CreateSubjectDto) {
    return this.subjectService.createSubject(userId, createSubjectDto);
  }

  async updateSubject(userId: string, subjectId: string, updateSubjectDto: UpdateSubjectDto) {
    return this.subjectService.updateSubject(userId, subjectId, updateSubjectDto);
  }

  async deleteSubject(userId: string, subjectId: string) {
    return this.subjectService.deleteSubject(userId, subjectId);
  }

  // Department methods
  async getDepartmentsViewData(userId: string): Promise<DepartmentsViewData> {
    return this.departmentService.getDepartmentsViewData(userId);
  }

  async createDepartment(userId: string, createDepartmentDto: CreateDepartmentDto) {
    return this.departmentService.createDepartment(userId, createDepartmentDto);
  }

  async updateDepartment(
    userId: string,
    departmentId: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentService.updateDepartment(userId, departmentId, updateDepartmentDto);
  }

  async archiveDepartment(userId: string, departmentId: string) {
    return this.departmentService.archiveDepartment(userId, departmentId);
  }

  async unarchiveDepartment(userId: string, departmentId: string) {
    return this.departmentService.unarchiveDepartment(userId, departmentId);
  }

  async deleteDepartment(userId: string, departmentId: string) {
    return this.departmentService.deleteDepartment(userId, departmentId);
  }

  // Level methods
  async getLevelsViewData(userId: string): Promise<LevelsViewData> {
    return this.levelService.getLevelsViewData(userId);
  }

  async createLevel(userId: string, createLevelDto: CreateLevelDto) {
    return this.levelService.createLevel(userId, createLevelDto);
  }

  async updateLevel(userId: string, levelId: string, updateLevelDto: UpdateLevelDto) {
    return this.levelService.updateLevel(userId, levelId, updateLevelDto);
  }

  async archiveLevel(userId: string, levelId: string) {
    return this.levelService.archiveLevel(userId, levelId);
  }

  async unarchiveLevel(userId: string, levelId: string) {
    return this.levelService.unarchiveLevel(userId, levelId);
  }

  async deleteLevel(userId: string, levelId: string) {
    return this.levelService.deleteLevel(userId, levelId);
  }

  // Admin methods
  async getAdminsViewData(userId: string): Promise<AdminsViewData> {
    return this.adminService.getAdminsViewData(userId);
  }

  async getDashboardSummaryData(userId: string): Promise<DashboardSummaryData> {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not associated with a school');
    }

    const schoolId = user.schoolId;

    // Get current academic session and term
    const currentSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
    });

    if (!currentSession) {
      // Return empty data for new schools without academic sessions
      return {
        overview: {
          totalStudents: 0,
          totalTeachers: 0,
          totalClassrooms: 0,
          totalSubjects: 0,
          totalDepartments: 0,
          totalLevels: 0,
          totalAdmins: 0,
        },
        studentStats: {
          totalStudents: 0,
          maleStudents: 0,
          femaleStudents: 0,
          activeStudents: 0,
          graduatedStudents: 0,
          newAdmissions: 0,
          genderDistribution: {
            male: 0,
            female: 0,
            malePercentage: 0,
            femalePercentage: 0,
          },
        },
        teacherStats: {
          totalTeachers: 0,
          activeTeachers: 0,
          inactiveTeachers: 0,
          onLeaveTeachers: 0,
          employmentBreakdown: {
            fullTime: 0,
            partTime: 0,
            contract: 0,
          },
          statusBreakdown: {
            active: 0,
            inactive: 0,
            onLeave: 0,
          },
        },
        classroomStats: {
          totalClassrooms: 0,
          classroomsWithTeachers: 0,
          classroomsWithoutTeachers: 0,
          averageClassSize: 0,
          largestClass: {
            name: 'N/A',
            size: 0,
          },
          smallestClass: {
            name: 'N/A',
            size: 0,
          },
        },
        subjectStats: {
          totalSubjects: 0,
          categoryBreakdown: {
            core: 0,
            general: 0,
            vocational: 0,
          },
          subjectsWithTeachers: 0,
          subjectsWithoutTeachers: 0,
        },
        departmentStats: {
          totalDepartments: 0,
          activeDepartments: 0,
          archivedDepartments: 0,
          departmentsWithHOD: 0,
          departmentsWithoutHOD: 0,
          averageTeachersPerDept: 0,
        },
        levelStats: {
          totalLevels: 0,
          activeLevels: 0,
          archivedLevels: 0,
          levelsWithClassArms: 0,
          levelsWithoutClassArms: 0,
          averageStudentsPerLevel: 0,
        },
        adminStats: {
          totalAdmins: 0,
          activeAdmins: 0,
          inactiveAdmins: 0,
          superAdmins: 0,
          regularAdmins: 0,
        },
        attendanceStats: {
          totalAttendanceRecords: 0,
          todayAttendanceRecords: 0,
          presentToday: 0,
          absentToday: 0,
          lateToday: 0,
          excusedToday: 0,
          attendanceRate: 0,
          totalStudents: 0,
        },
        paymentStats: {
          totalPayments: 0,
          paidPayments: 0,
          pendingPayments: 0,
          overduePayments: 0,
          partialPayments: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          overdueAmount: 0,
          collectionRate: 0,
        },
        academicPerformanceStats: {
          totalAssessments: 0,
          totalSubjectsWithAssessments: 0,
          averageAssessmentScore: 0,
          highestAssessmentScore: 0,
          lowestAssessmentScore: 0,
        },
        financialStats: {
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0,
          totalIncome: 0,
          totalExpenseAmount: 0,
          totalIncomeAmount: 0,
          totalExpenseAmountByCategory: {},
          totalIncomeAmountByCategory: {},
        },
        operationalStats: {
          totalStaff: 0,
          totalTeachers: 0,
          totalStudents: 0,
          totalClassrooms: 0,
          totalSubjects: 0,
          totalDepartments: 0,
          totalLevels: 0,
          totalAssessments: 0,
          totalAttendanceRecords: 0,
          totalPayments: 0,
          totalExpenses: 0,
          totalIncome: 0,
          totalRevenue: 0,
          totalNetProfit: 0,
        },
        academicInfo: {
          currentSession: 'No active session',
          currentTerm: 'No active term',
          sessionStartDate: null,
          sessionEndDate: null,
          daysRemaining: 0,
        },
      };
    }

    const currentTerm = await this.prisma.term.findFirst({
      where: {
        academicSessionId: currentSession.id,
        // You might want to add logic to determine current term
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch all statistics in parallel for better performance
    const [
      studentStats,
      teacherStats,
      classroomStats,
      subjectStats,
      departmentStats,
      levelStats,
      adminStats,
      attendanceStats,
      paymentStats,
      academicPerformanceStats,
      financialStats,
      operationalStats,
    ] = await Promise.all([
      this.getStudentStats(schoolId),
      this.getTeacherStats(schoolId),
      this.getClassroomStats(schoolId, currentSession.id),
      this.getSubjectStats(schoolId, currentSession.id),
      this.getDepartmentStats(schoolId),
      this.getLevelStats(schoolId),
      this.getAdminStats(schoolId),
      this.getAttendanceStats(schoolId, currentSession.id, currentTerm?.id),
      this.getPaymentStats(schoolId, currentSession.id),
      this.getAcademicPerformanceStats(schoolId),
      this.getFinancialStats(schoolId, currentSession.id),
      this.getOperationalStats(schoolId, currentSession.id),
    ]);

    return {
      overview: {
        totalStudents: studentStats.totalStudents,
        totalTeachers: teacherStats.totalTeachers,
        totalClassrooms: classroomStats.totalClassrooms,
        totalSubjects: subjectStats.totalSubjects,
        totalDepartments: departmentStats.totalDepartments,
        totalLevels: levelStats.totalLevels,
        totalAdmins: adminStats.totalAdmins,
      },
      studentStats,
      teacherStats,
      classroomStats,
      subjectStats,
      departmentStats,
      levelStats,
      adminStats,
      attendanceStats,
      paymentStats,
      academicPerformanceStats,
      financialStats,
      operationalStats,
      academicInfo: {
        currentSession: currentSession.academicYear,
        currentTerm: currentTerm?.name || 'No active term',
        sessionStartDate: currentSession.startDate,
        sessionEndDate: currentSession.endDate,
        daysRemaining: Math.ceil(
          (currentSession.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
        ),
      },
    };
  }

  async getRecentActivities(
    userId: string,
    query: {
      limit?: number;
      offset?: number;
      action?: string;
      category?: string;
      severity?: string;
      userId?: string;
    },
  ) {
    // Get user's school ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });

    if (!user?.schoolId) {
      throw new Error('User not associated with a school');
    }

    return this.activityLogService.queryActivities({
      schoolId: user.schoolId,
      limit: query.limit,
      offset: query.offset,
      action: query.action,
      category: query.category,
      severity: query.severity,
      userId: query.userId,
    });
  }

  private async getStudentStats(schoolId: string) {
    const [
      totalStudents,
      maleStudents,
      femaleStudents,
      activeStudents,
      graduatedStudents,
      newAdmissions,
    ] = await Promise.all([
      this.prisma.student.count({
        where: {
          classArmStudents: {
            some: {
              classArm: { schoolId },
            },
          },
        },
      }),
      this.prisma.student.count({
        where: {
          classArmStudents: {
            some: {
              classArm: { schoolId },
            },
          },
          user: { gender: 'MALE' },
        },
      }),
      this.prisma.student.count({
        where: {
          classArmStudents: {
            some: {
              classArm: { schoolId },
            },
          },
          user: { gender: 'FEMALE' },
        },
      }),
      this.prisma.student.count({
        where: {
          classArmStudents: {
            some: {
              classArm: { schoolId },
            },
          },
          deletedAt: null,
        },
      }),
      this.prisma.student.count({
        where: {
          classArmStudents: {
            some: {
              classArm: { schoolId },
            },
          },
          deletedAt: { not: null },
        },
      }),
      this.prisma.student.count({
        where: {
          classArmStudents: {
            some: {
              classArm: { schoolId },
            },
          },
          admissionDate: {
            gte: new Date(new Date().getFullYear(), 0, 1), // This year
          },
        },
      }),
    ]);

    return {
      totalStudents,
      maleStudents,
      femaleStudents,
      activeStudents,
      graduatedStudents,
      newAdmissions,
      genderDistribution: {
        male: maleStudents,
        female: femaleStudents,
        malePercentage: totalStudents > 0 ? Math.round((maleStudents / totalStudents) * 100) : 0,
        femalePercentage:
          totalStudents > 0 ? Math.round((femaleStudents / totalStudents) * 100) : 0,
      },
    };
  }

  private async getTeacherStats(schoolId: string) {
    const [
      totalTeachers,
      activeTeachers,
      inactiveTeachers,
      onLeaveTeachers,
      fullTimeTeachers,
      partTimeTeachers,
      contractTeachers,
    ] = await Promise.all([
      this.prisma.teacher.count({
        where: { user: { schoolId } },
      }),
      this.prisma.teacher.count({
        where: {
          user: { schoolId },
          status: 'ACTIVE',
        },
      }),
      this.prisma.teacher.count({
        where: {
          user: { schoolId },
          status: 'INACTIVE',
        },
      }),
      this.prisma.teacher.count({
        where: {
          user: { schoolId },
          status: 'ON_LEAVE',
        },
      }),
      this.prisma.teacher.count({
        where: {
          user: { schoolId },
          employmentType: 'FULL_TIME',
        },
      }),
      this.prisma.teacher.count({
        where: {
          user: { schoolId },
          employmentType: 'PART_TIME',
        },
      }),
      this.prisma.teacher.count({
        where: {
          user: { schoolId },
          employmentType: 'CONTRACT',
        },
      }),
    ]);

    return {
      totalTeachers,
      activeTeachers,
      inactiveTeachers,
      onLeaveTeachers,
      employmentBreakdown: {
        fullTime: fullTimeTeachers,
        partTime: partTimeTeachers,
        contract: contractTeachers,
      },
      statusBreakdown: {
        active: activeTeachers,
        inactive: inactiveTeachers,
        onLeave: onLeaveTeachers,
      },
    };
  }

  private async getClassroomStats(schoolId: string, sessionId: string) {
    const [totalClassrooms, classroomsWithTeachers, averageClassSize, largestClass, smallestClass] =
      await Promise.all([
        this.prisma.classArm.count({
          where: { schoolId, academicSessionId: sessionId },
        }),
        this.prisma.classArm.count({
          where: {
            schoolId,
            academicSessionId: sessionId,
            classTeacherId: { not: null },
          },
        }),
        this.prisma.classArm
          .findMany({
            where: { schoolId, academicSessionId: sessionId },
            include: {
              _count: { select: { classArmStudents: true } },
            },
          })
          .then((classArms) => {
            const totalStudents = classArms.reduce(
              (sum, classArm) => sum + classArm._count.classArmStudents,
              0,
            );
            return totalStudents / classArms.length || 0;
          }),
        this.prisma.classArm.findFirst({
          where: { schoolId, academicSessionId: sessionId },
          include: {
            _count: { select: { classArmStudents: true } },
          },
          orderBy: {
            classArmStudents: { _count: 'desc' },
          },
        }),
        this.prisma.classArm.findFirst({
          where: { schoolId, academicSessionId: sessionId },
          include: {
            _count: { select: { classArmStudents: true } },
          },
          orderBy: {
            classArmStudents: { _count: 'asc' },
          },
        }),
      ]);

    return {
      totalClassrooms,
      classroomsWithTeachers,
      classroomsWithoutTeachers: totalClassrooms - classroomsWithTeachers,
      averageClassSize: Math.round(averageClassSize || 0),
      largestClass: {
        name: largestClass?.name || 'N/A',
        size: largestClass?._count.classArmStudents || 0,
      },
      smallestClass: {
        name: smallestClass?.name || 'N/A',
        size: smallestClass?._count.classArmStudents || 0,
      },
    };
  }

  private async getSubjectStats(schoolId: string, sessionId: string) {
    const [totalSubjects, coreSubjects, generalSubjects, vocationalSubjects, subjectsWithTeachers] =
      await Promise.all([
        this.prisma.subject.count({
          where: { schoolId, deletedAt: null },
        }),
        this.prisma.subject.count({
          where: {
            schoolId,
            category: { name: 'Core' },
            deletedAt: null,
          },
        }),
        this.prisma.subject.count({
          where: {
            schoolId,
            category: { name: 'General' },
            deletedAt: null,
          },
        }),
        this.prisma.subject.count({
          where: {
            schoolId,
            category: { name: 'Vocational' },
            deletedAt: null,
          },
        }),
        this.prisma.subject.count({
          where: {
            schoolId,
            deletedAt: null,
            classArmSubjectTeachers: {
              some: {
                deletedAt: null,
                classArm: {
                  academicSessionId: sessionId,
                  deletedAt: null,
                },
              },
            },
          },
        }),
      ]);

    return {
      totalSubjects,
      categoryBreakdown: {
        core: coreSubjects,
        general: generalSubjects,
        vocational: vocationalSubjects,
      },
      subjectsWithTeachers,
      subjectsWithoutTeachers: totalSubjects - subjectsWithTeachers,
    };
  }

  private async getDepartmentStats(schoolId: string) {
    const [totalDepartments, activeDepartments, departmentsWithHOD, averageTeachersPerDept] =
      await Promise.all([
        this.prisma.department.count({
          where: { schoolId },
        }),
        this.prisma.department.count({
          where: { schoolId, deletedAt: null },
        }),
        this.prisma.department.count({
          where: { schoolId, hodId: { not: null } },
        }),
        this.prisma.department
          .findMany({
            where: { schoolId },
            include: {
              _count: { select: { teachers: true } },
            },
          })
          .then((departments) => {
            const totalTeachers = departments.reduce((sum, dept) => sum + dept._count.teachers, 0);
            return totalTeachers / departments.length || 0;
          }),
      ]);

    return {
      totalDepartments,
      activeDepartments,
      archivedDepartments: totalDepartments - activeDepartments,
      departmentsWithHOD,
      departmentsWithoutHOD: totalDepartments - departmentsWithHOD,
      averageTeachersPerDept: Math.round(averageTeachersPerDept || 0),
    };
  }

  private async getLevelStats(schoolId: string) {
    const [totalLevels, activeLevels, levelsWithClassArms, averageStudentsPerLevel] =
      await Promise.all([
        this.prisma.level.count({
          where: { schoolId },
        }),
        this.prisma.level.count({
          where: { schoolId, deletedAt: null },
        }),
        this.prisma.level.count({
          where: {
            schoolId,
            classArms: { some: {} },
          },
        }),
        this.prisma.level
          .findMany({
            where: { schoolId },
            include: {
              classArms: {
                include: {
                  _count: { select: { classArmStudents: true } },
                },
              },
            },
          })
          .then((levels) => {
            const totalStudents = levels.reduce((sum, level) => {
              const levelStudents = level.classArms.reduce(
                (levelSum, classArm) => levelSum + classArm._count.classArmStudents,
                0,
              );
              return sum + levelStudents;
            }, 0);
            return totalStudents / levels.length || 0;
          }),
      ]);

    return {
      totalLevels,
      activeLevels,
      archivedLevels: totalLevels - activeLevels,
      levelsWithClassArms,
      levelsWithoutClassArms: totalLevels - levelsWithClassArms,
      averageStudentsPerLevel: Math.round(averageStudentsPerLevel || 0),
    };
  }

  private async getAdminStats(schoolId: string) {
    const [totalAdmins, activeAdmins, superAdmins, regularAdmins] = await Promise.all([
      this.prisma.admin.count({
        where: { user: { schoolId } },
      }),
      this.prisma.admin.count({
        where: {
          user: { schoolId },
          deletedAt: null,
        },
      }),
      this.prisma.admin.count({
        where: {
          user: { schoolId },
          isSuper: true,
        },
      }),
      this.prisma.admin.count({
        where: {
          user: { schoolId },
          isSuper: false,
        },
      }),
    ]);

    return {
      totalAdmins,
      activeAdmins,
      inactiveAdmins: totalAdmins - activeAdmins,
      superAdmins,
      regularAdmins,
    };
  }

  private async getAttendanceStats(schoolId: string, sessionId: string, termId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereClause = {
      classArmStudent: {
        classArm: { schoolId },
      },
      ...(termId && { termId }),
    };

    const [
      totalAttendanceRecords,
      todayAttendanceRecords,
      presentToday,
      absentToday,
      lateToday,
      excusedToday,
    ] = await Promise.all([
      this.prisma.studentAttendance.count({
        where: whereClause,
      }),
      this.prisma.studentAttendance.count({
        where: {
          ...whereClause,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.studentAttendance.count({
        where: {
          ...whereClause,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
          status: 'PRESENT',
        },
      }),
      this.prisma.studentAttendance.count({
        where: {
          ...whereClause,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
          status: 'ABSENT',
        },
      }),
      this.prisma.studentAttendance.count({
        where: {
          ...whereClause,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
          status: 'LATE',
        },
      }),
      this.prisma.studentAttendance.count({
        where: {
          ...whereClause,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
          status: 'EXCUSED',
        },
      }),
    ]);

    const totalStudents = await this.prisma.student.count({
      where: {
        classArmStudents: {
          some: {
            classArm: { schoolId, academicSessionId: sessionId },
          },
        },
      },
    });

    return {
      totalAttendanceRecords,
      todayAttendanceRecords,
      presentToday,
      absentToday,
      lateToday,
      excusedToday,
      attendanceRate: totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0,
      totalStudents,
    };
  }

  private async getPaymentStats(schoolId: string, sessionId: string) {
    const [
      totalPayments,
      paidPayments,
      pendingPayments,
      overduePayments,
      partialPayments,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
    ] = await Promise.all([
      this.prisma.studentPayment.count({
        where: {
          student: {
            classArmStudents: {
              some: {
                classArm: { schoolId, academicSessionId: sessionId },
              },
            },
          },
        },
      }),
      this.prisma.studentPayment.count({
        where: {
          student: {
            classArmStudents: {
              some: {
                classArm: { schoolId, academicSessionId: sessionId },
              },
            },
          },
          status: 'PAID',
        },
      }),
      this.prisma.studentPayment.count({
        where: {
          student: {
            classArmStudents: {
              some: {
                classArm: { schoolId, academicSessionId: sessionId },
              },
            },
          },
          status: 'PENDING',
        },
      }),
      this.prisma.studentPayment.count({
        where: {
          student: {
            classArmStudents: {
              some: {
                classArm: { schoolId, academicSessionId: sessionId },
              },
            },
          },
          status: 'OVERDUE',
        },
      }),
      this.prisma.studentPayment.count({
        where: {
          student: {
            classArmStudents: {
              some: {
                classArm: { schoolId, academicSessionId: sessionId },
              },
            },
          },
          status: 'PARTIAL',
        },
      }),
      this.prisma.studentPayment.aggregate({
        where: {
          student: {
            classArmStudents: {
              some: {
                classArm: { schoolId, academicSessionId: sessionId },
              },
            },
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.studentPayment.aggregate({
        where: {
          student: {
            classArmStudents: {
              some: {
                classArm: { schoolId, academicSessionId: sessionId },
              },
            },
          },
          status: 'PAID',
        },
        _sum: { paidAmount: true },
      }),
      this.prisma.studentPayment.aggregate({
        where: {
          student: {
            classArmStudents: {
              some: {
                classArm: { schoolId, academicSessionId: sessionId },
              },
            },
          },
          status: 'PENDING',
        },
        _sum: { amount: true },
      }),
      this.prisma.studentPayment.aggregate({
        where: {
          student: {
            classArmStudents: {
              some: {
                classArm: { schoolId, academicSessionId: sessionId },
              },
            },
          },
          status: 'OVERDUE',
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalPayments,
      paidPayments,
      pendingPayments,
      overduePayments,
      partialPayments,
      totalAmount: Number(totalAmount._sum.amount || 0),
      paidAmount: Number(paidAmount._sum.paidAmount || 0),
      pendingAmount: Number(pendingAmount._sum.amount || 0),
      overdueAmount: Number(overdueAmount._sum.amount || 0),
      collectionRate:
        Number(totalAmount._sum.amount || 0) > 0
          ? Math.round(
              (Number(paidAmount._sum.paidAmount || 0) / Number(totalAmount._sum.amount || 0)) *
                100,
            )
          : 0,
    };
  }

  private async getAcademicPerformanceStats(schoolId: string) {
    const [
      totalAssessments,
      totalSubjectsWithAssessments,
      averageAssessmentScore,
      highestAssessmentScore,
      lowestAssessmentScore,
    ] = await Promise.all([
      this.prisma.subjectTermStudentAssessment.count({
        where: {
          subjectTermStudent: {
            subjectTerm: {
              academicSession: { schoolId },
            },
          },
        },
      }),
      this.prisma.subject.count({
        where: {
          schoolId,
          classArmSubjectTeachers: { some: {} },
        },
      }),
      this.prisma.subjectTermStudentAssessment.aggregate({
        where: {
          subjectTermStudent: {
            subjectTerm: {
              academicSession: { schoolId },
            },
          },
        },
        _avg: { score: true },
      }),
      this.prisma.subjectTermStudentAssessment.findFirst({
        where: {
          subjectTermStudent: {
            subjectTerm: {
              academicSession: { schoolId },
            },
          },
        },
        orderBy: { score: 'desc' },
      }),
      this.prisma.subjectTermStudentAssessment.findFirst({
        where: {
          subjectTermStudent: {
            subjectTerm: {
              academicSession: { schoolId },
            },
          },
        },
        orderBy: { score: 'asc' },
      }),
    ]);

    return {
      totalAssessments,
      totalSubjectsWithAssessments,
      averageAssessmentScore: averageAssessmentScore._avg.score || 0,
      highestAssessmentScore: highestAssessmentScore?.score || 0,
      lowestAssessmentScore: lowestAssessmentScore?.score || 0,
    };
  }

  private async getFinancialStats(schoolId: string, sessionId: string) {
    const [totalRevenue, totalIncome, totalExpenseAmount] = await Promise.all([
      this.prisma.studentPayment.aggregate({
        where: {
          student: {
            classArmStudents: {
              some: {
                classArm: { schoolId, academicSessionId: sessionId },
              },
            },
          },
          status: { in: ['PAID', 'PARTIAL'] },
        },
        _sum: { amount: true },
      }),
      this.prisma.studentPayment.aggregate({
        where: {
          student: {
            classArmStudents: {
              some: {
                classArm: { schoolId, academicSessionId: sessionId },
              },
            },
          },
          status: { in: ['PAID', 'PARTIAL'] },
        },
        _sum: { amount: true },
      }),
      this.prisma.studentPayment.aggregate({
        where: {
          student: {
            classArmStudents: {
              some: {
                classArm: { schoolId, academicSessionId: sessionId },
              },
            },
          },
          status: 'PENDING',
        },
        _sum: { amount: true },
      }),
    ]);

    const revenue = Number(totalRevenue._sum.amount || 0);
    const expenses = Number(totalExpenseAmount._sum.amount || 0);
    const income = Number(totalIncome._sum.amount || 0);

    return {
      totalRevenue: revenue,
      totalExpenses: expenses,
      netProfit: revenue - expenses,
      totalIncome: income,
      totalExpenseAmount: expenses,
      totalIncomeAmount: income,
      totalExpenseAmountByCategory: {},
      totalIncomeAmountByCategory: {},
    };
  }

  private async getOperationalStats(schoolId: string, sessionId: string) {
    const [
      totalStaff,
      totalTeachers,
      totalStudents,
      totalClassrooms,
      totalSubjects,
      totalDepartments,
      totalLevels,
      totalAssessments,
      totalAttendanceRecords,
      totalPayments,
      totalRevenue,
      totalNetProfit,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { schoolId, type: 'TEACHER' },
      }),
      this.prisma.teacher.count({
        where: { user: { schoolId } },
      }),
      this.prisma.student.count({
        where: {
          classArmStudents: {
            some: {
              classArm: { schoolId, academicSessionId: sessionId },
            },
          },
        },
      }),
      this.prisma.classArm.count({
        where: { schoolId, academicSessionId: sessionId },
      }),
      this.prisma.subject.count({
        where: { schoolId, classArmSubjectTeachers: { some: {} } },
      }),
      this.prisma.department.count({
        where: { schoolId, deletedAt: null },
      }),
      this.prisma.level.count({
        where: { schoolId, deletedAt: null },
      }),
      this.prisma.subjectTermStudentAssessment.count({
        where: {
          subjectTermStudent: {
            subjectTerm: {
              academicSession: { schoolId },
            },
          },
        },
      }),
      this.prisma.studentAttendance.count({
        where: {
          classArmStudent: {
            classArm: { schoolId, academicSessionId: sessionId },
          },
        },
      }),
      this.prisma.studentPayment.count({
        where: {
          student: {
            classArmStudents: {
              some: {
                classArm: { schoolId, academicSessionId: sessionId },
              },
            },
          },
          status: { in: ['PAID', 'PARTIAL'] },
        },
      }),
      this.prisma.studentPayment.aggregate({
        where: {
          student: {
            classArmStudents: {
              some: {
                classArm: { schoolId, academicSessionId: sessionId },
              },
            },
          },
          status: { in: ['PAID', 'PARTIAL'] },
        },
        _sum: { amount: true },
      }),
      this.prisma.studentPayment.aggregate({
        where: {
          student: {
            classArmStudents: {
              some: {
                classArm: { schoolId, academicSessionId: sessionId },
              },
            },
          },
          status: { in: ['PAID', 'PARTIAL'] },
        },
        _sum: { amount: true },
      }),
    ]);

    const revenue = Number(totalRevenue._sum.amount || 0);
    const netProfit = Number(totalNetProfit._sum.amount || 0);

    return {
      totalStaff,
      totalTeachers,
      totalStudents,
      totalClassrooms,
      totalSubjects,
      totalDepartments,
      totalLevels,
      totalAssessments,
      totalAttendanceRecords,
      totalPayments,
      totalExpenses: 0, // No expense model available
      totalIncome: revenue,
      totalRevenue: revenue,
      totalNetProfit: netProfit,
    };
  }

  async createClassroom(userId: string, createClassroomDto: CreateClassroomDto) {
    return this.classroomService.createClassroom(userId, createClassroomDto);
  }

  async getClassroomDetailsByLevelAndArm(
    userId: string,
    level: string,
    classArm: string,
    page: number,
    limit: number,
  ) {
    return this.classroomService.getClassroomDetailsByLevelAndArm(
      userId,
      level,
      classArm,
      page,
      limit,
    );
  }
}
