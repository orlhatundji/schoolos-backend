import { DashboardSummaryData } from '../types';

export class DashboardSummaryResult {
  overview: {
    totalStudents: number;
    totalTeachers: number;
    totalClassrooms: number;
    totalSubjects: number;
    totalDepartments: number;
    totalLevels: number;
    totalAdmins: number;
  };

  studentStats: {
    totalStudents: number;
    maleStudents: number;
    femaleStudents: number;
    activeStudents: number;
    graduatedStudents: number;
    newAdmissions: number;
    genderDistribution: {
      male: number;
      female: number;
      malePercentage: number;
      femalePercentage: number;
    };
  };

  teacherStats: {
    totalTeachers: number;
    activeTeachers: number;
    inactiveTeachers: number;
    onLeaveTeachers: number;
    employmentBreakdown: {
      fullTime: number;
      partTime: number;
      contract: number;
    };
    statusBreakdown: {
      active: number;
      inactive: number;
      onLeave: number;
    };
  };

  classroomStats: {
    totalClassrooms: number;
    classroomsWithTeachers: number;
    classroomsWithoutTeachers: number;
    averageClassSize: number;
    largestClass: {
      name: string;
      size: number;
    };
    smallestClass: {
      name: string;
      size: number;
    };
  };

  subjectStats: {
    totalSubjects: number;
    categoryBreakdown: {
      core: number;
      general: number;
      vocational: number;
    };
    subjectsWithTeachers: number;
    subjectsWithoutTeachers: number;
  };

  departmentStats: {
    totalDepartments: number;
    activeDepartments: number;
    archivedDepartments: number;
    departmentsWithHOD: number;
    departmentsWithoutHOD: number;
    averageTeachersPerDept: number;
  };

  levelStats: {
    totalLevels: number;
    activeLevels: number;
    archivedLevels: number;
    levelsWithClassArms: number;
    levelsWithoutClassArms: number;
    averageStudentsPerLevel: number;
  };

  adminStats: {
    totalAdmins: number;
    activeAdmins: number;
    inactiveAdmins: number;
    superAdmins: number;
    regularAdmins: number;
  };

  attendanceStats: {
    totalAttendanceRecords: number;
    todayAttendanceRecords: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
    excusedToday: number;
    attendanceRate: number;
    totalStudents: number;
  };

  paymentStats: {
    totalPayments: number;
    paidPayments: number;
    pendingPayments: number;
    overduePayments: number;
    partialPayments: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    collectionRate: number;
  };

  academicPerformanceStats: {
    totalAssessments: number;
    totalSubjectsWithAssessments: number;
    averageAssessmentScore: number;
    highestAssessmentScore: number;
    lowestAssessmentScore: number;
  };

  financialStats: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    totalIncome: number;
    totalExpenseAmount: number;
    totalIncomeAmount: number;
    totalExpenseAmountByCategory: any;
    totalIncomeAmountByCategory: any;
  };

  operationalStats: {
    totalStaff: number;
    totalTeachers: number;
    totalStudents: number;
    totalClassrooms: number;
    totalSubjects: number;
    totalDepartments: number;
    totalLevels: number;
    totalAssessments: number;
    totalAttendanceRecords: number;
    totalPayments: number;
    totalExpenses: number;
    totalIncome: number;
    totalRevenue: number;
    totalNetProfit: number;
  };

  academicInfo: {
    currentSession: string;
    currentTerm: string;
    sessionStartDate: string;
    sessionEndDate: string;
    daysRemaining: number;
  };

  constructor(data: DashboardSummaryData) {
    this.overview = data.overview;
    this.studentStats = data.studentStats;
    this.teacherStats = data.teacherStats;
    this.classroomStats = data.classroomStats;
    this.subjectStats = data.subjectStats;
    this.departmentStats = data.departmentStats;
    this.levelStats = data.levelStats;
    this.adminStats = data.adminStats;
    this.attendanceStats = data.attendanceStats;
    this.paymentStats = data.paymentStats;
    this.academicPerformanceStats = data.academicPerformanceStats;
    this.financialStats = data.financialStats;
    this.operationalStats = data.operationalStats;
    this.academicInfo = {
      ...data.academicInfo,
      sessionStartDate: data.academicInfo.sessionStartDate.toISOString(),
      sessionEndDate: data.academicInfo.sessionEndDate.toISOString(),
    };
  }
}
