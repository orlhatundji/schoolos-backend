import { TeacherDashboardData } from '../types';

export class TeacherDashboardResult {
  stats: {
    totalClasses: number;
    totalStudents: number;
    totalSubjects: number;
    averageClassSize: number;
    attendanceRate: number;
    pendingAssessments: number;
    completedAssessments: number;
  };

  academicInfo: {
    currentSession: string;
    currentTerm: string;
    sessionStartDate: string;
    sessionEndDate: string;
    daysRemaining: number;
  };

  constructor(data: TeacherDashboardData) {
    this.stats = data.stats;
    this.academicInfo = data.academicInfo;
  }
}
