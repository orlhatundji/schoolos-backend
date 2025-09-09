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
