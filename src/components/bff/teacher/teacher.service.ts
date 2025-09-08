import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma';
import { 
  TeacherDashboardData, 
  TeacherClassInfo, 
  TeacherSubjectInfo, 
  RecentActivity, 
  UpcomingEvent,
  TeacherProfile
} from './types';

@Injectable()
export class TeacherService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeacherDashboardData(userId: string): Promise<TeacherDashboardData> {
    // Get teacher information
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        user: {
          include: {
            school: true,
          },
        },
        classArmSubjectTeachers: {
          include: {
            subject: true,
            classArm: {
              include: {
                level: true,
                students: true,
              },
            },
          },
        },
        classArmTeachers: {
          include: {
            classArm: {
              include: {
                level: true,
                students: true,
              },
            },
          },
        },
        classArmsAsTeacher: {
          include: {
            level: true,
            students: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    const schoolId = teacher.user.schoolId;

    // Get current academic session and term
    const currentSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
    });

    if (!currentSession) {
      throw new Error('No current academic session found');
    }

    const currentTerm = await this.prisma.term.findFirst({
      where: {
        academicSessionId: currentSession.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get all unique classes the teacher is assigned to
    const allClasses = [
      ...teacher.classArmSubjectTeachers.map((cast) => cast.classArm),
      ...teacher.classArmTeachers.map((cat) => cat.classArm),
      ...teacher.classArmsAsTeacher,
    ];

    // Remove duplicates based on classArm id
    const uniqueClasses = allClasses.filter(
      (classArm, index, self) => index === self.findIndex((c) => c.id === classArm.id),
    );

    // Get all unique subjects the teacher teaches
    const uniqueSubjects = teacher.classArmSubjectTeachers
      .map((cast) => cast.subject)
      .filter((subject, index, self) => index === self.findIndex((s) => s.id === subject.id));

    // Calculate core statistics only
    const totalStudents = uniqueClasses.reduce((sum, classArm) => sum + classArm.students.length, 0);
    const averageClassSize = uniqueClasses.length > 0 ? totalStudents / uniqueClasses.length : 0;

    // Get attendance rate
    const attendanceRate = await this.getAttendanceRate(teacher.id, currentSession.id, currentTerm?.id);

    // Get assessment counts
    const assessmentCounts = await this.getAssessmentCounts(teacher.id, currentSession.id);

    return {
      stats: {
        totalClasses: uniqueClasses.length,
        totalStudents,
        totalSubjects: uniqueSubjects.length,
        averageClassSize: Math.round(averageClassSize * 100) / 100,
        attendanceRate,
        pendingAssessments: assessmentCounts.pending,
        completedAssessments: assessmentCounts.completed,
      },
      academicInfo: {
        currentSession: currentSession.academicYear,
        currentTerm: currentTerm?.name || 'No active term',
        sessionStartDate: currentSession.startDate.toISOString(),
        sessionEndDate: currentSession.endDate.toISOString(),
        daysRemaining: Math.ceil(
          (currentSession.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
        ),
      },
    };
  }

  // Get teacher's classes
  async getTeacherClasses(userId: string): Promise<TeacherClassInfo[]> {
    const teacher = await this.getTeacherWithRelations(userId);
    
    const allClasses = [
      ...teacher.classArmSubjectTeachers.map((cast) => cast.classArm),
      ...teacher.classArmTeachers.map((cat) => cat.classArm),
      ...teacher.classArmsAsTeacher,
    ];

    const uniqueClasses = allClasses.filter(
      (classArm, index, self) => index === self.findIndex((c) => c.id === classArm.id),
    );

    return uniqueClasses.map((classArm) => ({
      id: classArm.id,
      name: classArm.name,
      level: classArm.level.name,
      subject: teacher.classArmSubjectTeachers
        .find((cast) => cast.classArmId === classArm.id)
        ?.subject.name || 'Class Teacher',
      studentsCount: classArm.students.length,
      nextClassTime: this.getNextClassTime(classArm.id),
      location: (classArm as any).location || undefined,
      isClassTeacher: teacher.classArmsAsTeacher.some((cat) => cat.id === classArm.id),
    }));
  }

  // Get teacher's subjects
  async getTeacherSubjects(userId: string): Promise<TeacherSubjectInfo[]> {
    const teacher = await this.getTeacherWithRelations(userId);
    const currentSession = await this.getCurrentSession(teacher.user.schoolId);

    const uniqueSubjects = teacher.classArmSubjectTeachers
      .map((cast) => cast.subject)
      .filter((subject, index, self) => index === self.findIndex((s) => s.id === subject.id));

    return Promise.all(uniqueSubjects.map(async (subject) => ({
      id: subject.id,
      name: subject.name,
      department: (subject as any).department?.name || 'Unassigned',
      classesCount: teacher.classArmSubjectTeachers.filter((cast) => cast.subjectId === subject.id).length,
      totalStudents: teacher.classArmSubjectTeachers
        .filter((cast) => cast.subjectId === subject.id)
        .reduce((sum, cast) => sum + cast.classArm.students.length, 0),
      averageScore: await this.getSubjectAverageScore(subject.id, currentSession.id),
    })));
  }

  // Get recent activities
  async getRecentActivities(userId: string, limit: number = 10): Promise<RecentActivity[]> {
    const teacher = await this.getTeacherWithRelations(userId);
    
    // This would typically come from an activity log or audit trail
    // For now, we'll return mock data - you can implement this based on your activity logging system
    return [
      {
        id: '1',
        type: 'attendance' as const,
        title: 'Marked attendance for JSS 1A',
        description: '25 students present, 3 absent',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        classId: 'class_1',
      },
      {
        id: '2',
        type: 'assessment' as const,
        title: 'Graded Mathematics Test',
        description: 'Average score: 78%',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        subjectId: 'math_1',
      },
    ];
  }

  // Get upcoming events
  async getUpcomingEvents(userId: string, days: number = 7): Promise<UpcomingEvent[]> {
    const teacher = await this.getTeacherWithRelations(userId);
    
    // This would typically come from a calendar or schedule system
    // For now, we'll return mock data
    return [
      {
        id: '1',
        type: 'class' as const,
        title: 'Mathematics - JSS 1A',
        description: 'Algebra basics',
        date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        time: '09:00 AM',
        location: 'Room 101',
        classId: 'class_1',
        subjectId: 'math_1',
        priority: 'high' as const,
      },
      {
        id: '2',
        type: 'assessment' as const,
        title: 'Physics Test Due',
        description: 'Chapter 5-7 Test',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        time: '11:59 PM',
        subjectId: 'physics_1',
        priority: 'medium' as const,
      },
    ];
  }

  // Helper method to get teacher with relations
  private async getTeacherWithRelations(userId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        user: {
          include: {
            school: true,
          },
        },
        classArmSubjectTeachers: {
          include: {
            subject: true,
            classArm: {
              include: {
                level: true,
                students: true,
              },
            },
          },
        },
        classArmTeachers: {
          include: {
            classArm: {
              include: {
                level: true,
                students: true,
              },
            },
          },
        },
        classArmsAsTeacher: {
          include: {
            level: true,
            students: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    return teacher;
  }

  // Get teacher profile information
  async getTeacherProfile(userId: string): Promise<TeacherProfile> {
    const teacher = await this.getTeacherWithRelations(userId);
    
    return {
      teacherNo: teacher.teacherNo,
      firstName: teacher.user.firstName,
      lastName: teacher.user.lastName,
      email: teacher.user.email,
      phone: teacher.user.phone,
      department: (teacher as any).department?.name || 'Unassigned',
      status: teacher.status,
      employmentType: teacher.employmentType,
      qualification: teacher.qualification,
      joinDate: teacher.joinDate.toISOString(),
      avatar: teacher.user.avatarUrl,
    };
  }

  // Helper method to get current session
  private async getCurrentSession(schoolId: string) {
    const currentSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
    });

    if (!currentSession) {
      throw new Error('No current academic session found');
    }

    return currentSession;
  }

  private async getTeacherPerformanceMetrics(teacherId: string, sessionId: string) {
    // This would typically calculate from actual data
    // For now, we'll return mock data
    return {
      averageAttendanceRate: 85.5,
      averageAssessmentScore: 78.2,
      totalClassesConducted: 45,
      totalAssessmentsGraded: 12,
      studentSatisfactionScore: 4.2,
      onTimeRate: 92.0,
    };
  }

  private async getAttendanceRate(teacherId: string, sessionId: string, termId?: string) {
    // This would typically calculate from attendance records
    // For now, we'll return mock data
    return 87.5;
  }

  private async getAssessmentCounts(teacherId: string, sessionId: string) {
    // This would typically count from assessment records
    // For now, we'll return mock data
    return {
      pending: 3,
      completed: 12,
    };
  }

  private getNextClassTime(classId: string): string | undefined {
    // This would typically come from a schedule system
    // For now, we'll return mock data
    return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  }

  private async getSubjectAverageScore(subjectId: string, sessionId: string): Promise<number | undefined> {
    // This would typically calculate from assessment scores
    // For now, we'll return mock data
    return 78.5;
  }
}
