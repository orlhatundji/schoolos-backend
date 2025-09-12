// Core dashboard stats - only essential metrics
export interface TeacherDashboardStats {
  totalClasses: number;
  totalStudents: number;
  totalSubjects: number;
  averageClassSize: number;
  attendanceRate: number;
  pendingAssessments: number;
  completedAssessments: number;
}

// Academic information
export interface AcademicInfo {
  currentSession: string;
  currentTerm: string;
  sessionStartDate: string;
  sessionEndDate: string;
  daysRemaining: number;
}

// Core dashboard data - minimal and focused
export interface TeacherDashboardData {
  stats: TeacherDashboardStats;
  academicInfo: AcademicInfo;
}

// Teacher profile information
export interface TeacherProfile {
  teacherNo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  status: string;
  employmentType: string;
  qualification: string;
  joinDate: string;
  avatar?: string;
}

// Class information
export interface TeacherClassInfo {
  id: string;
  name: string;
  level: string;
  subject: string;
  studentsCount: number;
  nextClassTime?: string;
  location?: string;
  isClassTeacher: boolean;
}

// Class details for class teachers
export interface ClassDetails {
  id: string;
  name: string;
  level: string;
  department?: string;
  classTeacher: {
    id: string;
    name: string;
    email: string;
  };
  captain?: {
    id: string;
    name: string;
    studentNo: string;
  };
  stats: {
    totalStudents: number;
    maleStudents: number;
    femaleStudents: number;
    averageAge: number;
    attendanceRate: number;
    averageScore: number;
  };
  recentActivities: {
    id: string;
    type: string;
    title: string;
    date: string;
  }[];
}

// Student information for class teachers
export interface ClassStudentInfo {
  id: string;
  studentNo: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  gender: string;
  dateOfBirth?: string;
  stateOfOrigin?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  admissionDate: string;
  status: string;
  avatarUrl?: string;
}

// Subject assessment scores for a class
export interface SubjectAssessmentScores {
  subjectId: string;
  subjectName: string;
  teacher: {
    id: string;
    name: string;
  };
  students: {
    id: string;
    studentNo: string;
    fullName: string;
    gender: string;
    assessments: {
      id: string;
      name: string;
      score: number;
      maxScore: number;
      percentage: number;
      isExam: boolean;
      date: string;
    }[];
    totalScore: number;
    averageScore: number;
    grade?: string;
  }[];
  classStats: {
    totalStudents: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
  };
}

// Subject information
export interface TeacherSubjectInfo {
  id: string;
  name: string;
  department: string;
  classesCount: number;
  totalStudents: number;
  averageScore?: number;
}

// Recent activities
export interface RecentActivity {
  id: string;
  type: 'attendance' | 'assessment' | 'class' | 'announcement';
  title: string;
  description: string;
  timestamp: string;
  classId?: string;
  subjectId?: string;
}

// Upcoming events
export interface UpcomingEvent {
  id: string;
  type: 'class' | 'assessment' | 'meeting' | 'deadline';
  title: string;
  description: string;
  date: string;
  time: string;
  location?: string;
  classId?: string;
  subjectId?: string;
  priority: 'low' | 'medium' | 'high';
}

// Performance metrics
export interface TeacherPerformanceMetrics {
  averageAttendanceRate: number;
  averageAssessmentScore: number;
  totalClassesConducted: number;
  totalAssessmentsGraded: number;
  studentSatisfactionScore?: number;
  onTimeRate: number;
}
