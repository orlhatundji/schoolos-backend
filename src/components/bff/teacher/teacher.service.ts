import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma';
import { 
  TeacherDashboardData, 
  TeacherClassInfo, 
  TeacherSubjectInfo, 
  RecentActivity, 
  UpcomingEvent,
  TeacherProfile,
  ClassDetails,
  ClassStudentInfo
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

  // Get teacher's classes (only classes where teacher is the class teacher)
  async getTeacherClasses(userId: string): Promise<TeacherClassInfo[]> {
    const teacher = await this.getTeacherWithRelations(userId);
    
    // Only return classes where the teacher is the actual class teacher
    return teacher.classArmsAsTeacher.map((classArm) => ({
      id: classArm.id,
      name: classArm.name,
      level: classArm.level.name,
      subject: 'Class Teacher', // Always "Class Teacher" since this endpoint only returns class teacher assignments
      studentsCount: classArm.students.length,
      nextClassTime: this.getNextClassTime(classArm.id),
      location: (classArm as any).location || undefined,
      isClassTeacher: true, // Always true since this endpoint only returns class teacher assignments
    }));
  }

  // Get teacher's subject assignments (classes where teacher teaches specific subjects)
  async getTeacherSubjectAssignments(userId: string): Promise<TeacherClassInfo[]> {
    const teacher = await this.getTeacherWithRelations(userId);
    
    // Return classes where the teacher teaches specific subjects
    return teacher.classArmSubjectTeachers.map((cast) => ({
      id: cast.classArm.id,
      name: cast.classArm.name,
      level: cast.classArm.level.name,
      subject: cast.subject.name,
      studentsCount: cast.classArm.students.length,
      nextClassTime: this.getNextClassTime(cast.classArm.id),
      location: (cast.classArm as any).location || undefined,
      isClassTeacher: teacher.classArmsAsTeacher.some((cat) => cat.id === cast.classArm.id),
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

  // Get class details for class teachers
  async getClassDetails(userId: string, level: string, classArm: string): Promise<ClassDetails> {
    const teacher = await this.getTeacherWithRelations(userId);
    
    // Find the specific class arm
    const classArmData = await this.prisma.classArm.findFirst({
      where: {
        name: classArm,
        level: {
          name: level,
        },
        schoolId: teacher.user.schoolId,
        deletedAt: null,
      },
      include: {
        level: true,
        department: true,
        classTeacher: {
          include: {
            user: true,
          },
        },
        captain: {
          include: {
            user: true,
          },
        },
        students: {
          include: {
            user: true,
          },
        },
        studentAttendances: {
          where: {
            date: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        },
      },
    });

    if (!classArmData) {
      throw new Error('Class not found');
    }

    // Verify the teacher is the class teacher for this class
    if (classArmData.classTeacherId !== teacher.id) {
      throw new Error('You are not the class teacher for this class');
    }

    // Calculate statistics
    const students = classArmData.students;
    const maleStudents = students.filter(s => s.user.gender === 'MALE').length;
    const femaleStudents = students.filter(s => s.user.gender === 'FEMALE').length;
    
    // Calculate average age
    const currentYear = new Date().getFullYear();
    const totalAge = students.reduce((sum, student) => {
      if (student.user.dateOfBirth) {
        const birthYear = new Date(student.user.dateOfBirth).getFullYear();
        return sum + (currentYear - birthYear);
      }
      return sum;
    }, 0);
    const averageAge = students.length > 0 ? Math.round(totalAge / students.length) : 0;

    // Calculate attendance rate
    const totalAttendanceRecords = classArmData.studentAttendances.length;
    const presentRecords = classArmData.studentAttendances.filter(
      attendance => attendance.status === 'PRESENT'
    ).length;
    const attendanceRate = totalAttendanceRecords > 0 
      ? Math.round((presentRecords / totalAttendanceRecords) * 100) 
      : 0;

    // Get recent activities (mock data for now)
    const recentActivities = [
      {
        id: '1',
        type: 'attendance',
        title: 'Daily attendance marked',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        type: 'assessment',
        title: 'Mathematics test conducted',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    return {
      id: classArmData.id,
      name: classArmData.name,
      level: classArmData.level.name,
      department: classArmData.department?.name,
      classTeacher: {
        id: classArmData.classTeacher.id,
        name: `${classArmData.classTeacher.user.firstName} ${classArmData.classTeacher.user.lastName}`,
        email: classArmData.classTeacher.user.email || '',
      },
      captain: classArmData.captain ? {
        id: classArmData.captain.id,
        name: `${classArmData.captain.user.firstName} ${classArmData.captain.user.lastName}`,
        studentNo: classArmData.captain.studentNo,
      } : undefined,
      stats: {
        totalStudents: students.length,
        maleStudents,
        femaleStudents,
        averageAge,
        attendanceRate,
        averageScore: 78.5, // Mock data - would calculate from actual assessments
      },
      recentActivities,
    };
  }

  // Get students in a specific class for class teachers
  async getClassStudents(userId: string, level: string, classArm: string): Promise<ClassStudentInfo[]> {
    const teacher = await this.getTeacherWithRelations(userId);
    
    // Find the specific class arm
    const classArmData = await this.prisma.classArm.findFirst({
      where: {
        name: classArm,
        level: {
          name: level,
        },
        schoolId: teacher.user.schoolId,
        deletedAt: null,
      },
      include: {
        students: {
          include: {
            user: true,
            guardian: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!classArmData) {
      throw new Error('Class not found');
    }

    // Verify the teacher is the class teacher for this class
    if (classArmData.classTeacherId !== teacher.id) {
      throw new Error('You are not the class teacher for this class');
    }

    return classArmData.students.map(student => {
      return {
        id: student.id,
        studentNo: student.studentNo,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        fullName: `${student.user.firstName} ${student.user.lastName}`,
        email: student.user.email || undefined,
        gender: student.user.gender,
        dateOfBirth: student.user.dateOfBirth?.toISOString(),
        stateOfOrigin: student.user.stateOfOrigin || undefined,
        guardianName: student.guardian ? 
          `${student.guardian.user.firstName} ${student.guardian.user.lastName}` : 
          undefined,
        guardianPhone: student.guardian?.user.phone || undefined,
        guardianEmail: student.guardian?.user.email || undefined,
        admissionDate: student.admissionDate.toISOString(),
        status: student.status,
        avatarUrl: student.user.avatarUrl || undefined,
      };
    });
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
