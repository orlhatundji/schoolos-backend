export interface ViewStats {
  totalClassrooms: number;
  totalStudents: number;
  gradeLevels: number;
  capacityUsage: number;
}

export interface ClassroomInfo {
  id: string;
  name: string;
  slug: string;
  level: string;
  location: string | null;
  classTeacher: {
    teacherNo: string;
    name: string;
  } | null;
  classCaptain: {
    id: string;
    name: string;
    studentNo: string;
  } | null;
  studentsCount: number;
}

export interface AdminClassroomsViewData {
  stats: ViewStats;
  classrooms: ClassroomInfo[];
}

export interface ClassroomPopulation {
  total: number;
  male: number;
  female: number;
}

export interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  attendanceRate: number; // percentage
  studentsPresent: number; // number of students currently present today
  studentsAbsent: number; // number of students currently absent today
  totalStudents: number; // total students in the classroom
}

export interface TopPerformer {
  id: string;
  name: string;
  score: number;
  subject: string;
}

export interface StudentInfo {
  id: string;
  name: string;
  gender: string;
  age: number;
  admissionNumber: string;
  guardianPhone: string | null;
  guardianName: string;
  stateOfOrigin: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedStudents {
  students: StudentInfo[];
  pagination: PaginationInfo;
}

export interface ClassroomDetailsData {
  classroom: {
    id: string;
    name: string;
    level: string;
    location: string | null;
    academicSessionId: string;
  };
  population: ClassroomPopulation;
  attendance: AttendanceStats;
  classTeacher: {
    id: string;
    name: string;
    phone: string | null;
    email: string;
  } | null;
  classCaptain: {
    id: string;
    name: string;
    admissionNumber: string;
  } | null;
  students: StudentInfo[];
  topPerformers: TopPerformer[];
}

export interface StudentDetailInfo {
  id: string;
  name: string;
  studentId: string;
  admissionNumber: string;
  gender: string;
  age: number;
  stateOfOrigin: string;
  guardianName: string;
  guardianPhone: string | null;
  telephone: string | null;
  className: string;
  classLevel: string;
  averageGrade: number;
  isPresent: boolean;
  attendanceRate: number;
  avatarUrl: string | null;
}

export interface PaginatedStudentDetails {
  students: StudentDetailInfo[];
  pagination: PaginationInfo;
}

// Type alias for single student details (same structure as StudentDetailInfo)
export type SingleStudentDetails = StudentDetailInfo;

// Teacher-related types
export interface TeacherStats {
  totalTeachers: number;
  activeTeachers: number;
  inactiveTeachers: number;
  onLeaveTeachers: number;
}

export interface TeacherInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  subjects: string[];
  employment: 'full-time' | 'part-time' | 'contract';
  experience: number;
  qualification: string;
  joinDate: string; // YYYY-MM-DD
  lastLogin: string | null; // ISO 8601
  status: 'active' | 'inactive' | 'on-leave';
  classesAssigned: string[];
  avatar: string | null; // URL
}

export interface TeachersViewData {
  stats: TeacherStats;
  teachers: TeacherInfo[];
}

export interface SingleTeacherDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  subjects: string[];
  employment: 'full-time' | 'part-time' | 'contract';
  experience: number;
  qualification: string;
  joinDate: string; // YYYY-MM-DD
  lastLogin: string | null; // ISO 8601
  status: 'active' | 'inactive' | 'on-leave';
  classesAssigned: string[];
  avatar: string | null; // URL
  // Additional detailed fields
  dateOfBirth: string | null; // YYYY-MM-DD
  gender: string;
  stateOfOrigin: string | null;
  address: {
    street1: string | null;
    street2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
  isHOD: boolean;
  hodDepartment: string | null;
  totalStudents: number;
  averageClassSize: number;
}

// Students View types
export interface StudentStats {
  totalStudents: number;
  maleStudents: number;
  femaleStudents: number;
  graduatedStudents: number;
  attendanceToday: {
    present: number;
    absent: number;
    presentPercentage: number;
    absentPercentage: number;
  };
  statusBreakdown: {
    active: number;
    inactive: number;
    suspended: number;
  };
}

export interface StudentsViewData {
  stats: StudentStats;
  students: StudentDetailInfo[];
}

// Subjects View types
export interface SubjectStats {
  totalSubjects: number;
  categoryBreakdown: {
    core: number;
    general: number;
    vocational: number;
  };
  departmentBreakdown: {
    [departmentName: string]: number;
  };
}

export interface SubjectInfo {
  id: string;
  name: string;
  department: string | null;
  category: string | null;
  classesCount: number;
  studentCount: number;
  status: 'active' | 'inactive';
}

export interface SubjectsViewData {
  stats: SubjectStats;
  subjects: SubjectInfo[];
}

// Departments View types
export interface DepartmentStats {
  totalDepartments: number;
  activeDepartments: number;
  archivedDepartments: number;
  departmentsWithHOD: number;
  departmentsWithoutHOD: number;
}

export interface DepartmentInfo {
  id: string;
  name: string;
  code: string;
  hodName: string | null;
  hodId: string | null;
  subjectsCount: number;
  classesCount: number;
  teachersCount: number;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentsViewData {
  stats: DepartmentStats;
  departments: DepartmentInfo[];
}

// Admins View types
export interface AdminStats {
  totalAdmins: number;
  activeAdmins: number;
  inactiveAdmins: number;
  suspendedAdmins: number;
  hodCount: number;
}

export interface AdminInfo {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  department: string | null;
  status: 'active' | 'inactive' | 'suspended';
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface AdminsViewData {
  stats: AdminStats;
  admins: AdminInfo[];
}

// Levels View types
export interface LevelStats {
  totalLevels: number;
  activeLevels: number;
  archivedLevels: number;
  levelsWithClassArms: number;
  levelsWithoutClassArms: number;
}

export interface LevelInfo {
  id: string;
  name: string;
  code: string;
  order: number;
  classArmsCount: number;
  studentsCount: number;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface LevelsViewData {
  stats: LevelStats;
  levels: LevelInfo[];
}

// Dashboard Summary types
export interface DashboardOverview {
  totalStudents: number;
  totalTeachers: number;
  totalClassrooms: number;
  totalSubjects: number;
  totalDepartments: number;
  totalLevels: number;
  totalAdmins: number;
}

export interface DashboardStudentStats {
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
}

export interface DashboardTeacherStats {
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
}

export interface DashboardClassroomStats {
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
}

export interface DashboardSubjectStats {
  totalSubjects: number;
  categoryBreakdown: {
    core: number;
    general: number;
    vocational: number;
  };
  subjectsWithTeachers: number;
  subjectsWithoutTeachers: number;
}

export interface DashboardDepartmentStats {
  totalDepartments: number;
  activeDepartments: number;
  archivedDepartments: number;
  departmentsWithHOD: number;
  departmentsWithoutHOD: number;
  averageTeachersPerDept: number;
}

export interface DashboardLevelStats {
  totalLevels: number;
  activeLevels: number;
  archivedLevels: number;
  levelsWithClassArms: number;
  levelsWithoutClassArms: number;
  averageStudentsPerLevel: number;
}

export interface DashboardAdminStats {
  totalAdmins: number;
  activeAdmins: number;
  inactiveAdmins: number;
  superAdmins: number;
  regularAdmins: number;
}

export interface DashboardAttendanceStats {
  totalAttendanceRecords: number;
  todayAttendanceRecords: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  excusedToday: number;
  attendanceRate: number;
  totalStudents: number;
}

export interface DashboardPaymentStats {
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
}

export interface AcademicInfo {
  currentSession: string;
  currentTerm: string;
  sessionStartDate: Date;
  sessionEndDate: Date;
  daysRemaining: number;
}

export interface DashboardAcademicPerformanceStats {
  totalAssessments: number;
  totalSubjectsWithAssessments: number;
  averageAssessmentScore: number;
  highestAssessmentScore: number;
  lowestAssessmentScore: number;
}

export interface DashboardFinancialStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalIncome: number;
  totalExpenseAmount: number;
  totalIncomeAmount: number;
  totalExpenseAmountByCategory: any;
  totalIncomeAmountByCategory: any;
}

export interface DashboardOperationalStats {
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
}

export interface DashboardSummaryData {
  overview: DashboardOverview;
  studentStats: DashboardStudentStats;
  teacherStats: DashboardTeacherStats;
  classroomStats: DashboardClassroomStats;
  subjectStats: DashboardSubjectStats;
  departmentStats: DashboardDepartmentStats;
  levelStats: DashboardLevelStats;
  adminStats: DashboardAdminStats;
  attendanceStats: DashboardAttendanceStats;
  paymentStats: DashboardPaymentStats;
  academicPerformanceStats: DashboardAcademicPerformanceStats;
  financialStats: DashboardFinancialStats;
  operationalStats: DashboardOperationalStats;
  academicInfo: AcademicInfo;
}
