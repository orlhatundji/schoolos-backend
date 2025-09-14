import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../prisma';
import {
  ClassDetails,
  ClassStudentInfo,
  RecentActivity,
  SubjectAssessmentScores,
  TeacherClassInfo,
  TeacherDashboardData,
  TeacherProfile,
  TeacherSubjectInfo,
  UpcomingEvent,
} from './types';
import { BulkCreateStudentAssessmentScoreDto } from './dto/bulk-create-student-assessment-score.dto';
import { BulkUpdateStudentAssessmentScoreDto } from './dto/bulk-update-student-assessment-score.dto';
import { UpsertStudentAssessmentScoreDto } from './dto/upsert-student-assessment-score.dto';
import { BulkStudentAssessmentScoreResult } from './results/bulk-student-assessment-score-result';

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
    const totalStudents = uniqueClasses.reduce(
      (sum, classArm) => sum + classArm.students.length,
      0,
    );
    const averageClassSize = uniqueClasses.length > 0 ? totalStudents / uniqueClasses.length : 0;

    // Get attendance rate
    const attendanceRate = await this.getAttendanceRate(
      teacher.id,
      currentSession.id,
      currentTerm?.id,
    );

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

    return Promise.all(
      uniqueSubjects.map(async (subject) => ({
        id: subject.id,
        name: subject.name,
        department: (subject as any).department?.name || 'Unassigned',
        classesCount: teacher.classArmSubjectTeachers.filter(
          (cast) => cast.subjectId === subject.id,
        ).length,
        totalStudents: teacher.classArmSubjectTeachers
          .filter((cast) => cast.subjectId === subject.id)
          .reduce((sum, cast) => sum + cast.classArm.students.length, 0),
        averageScore: await this.getSubjectAverageScore(subject.id, currentSession.id),
      })),
    );
  }

  // Get recent activities
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getRecentActivities(userId: string, _limit: number = 10): Promise<RecentActivity[]> {
    // Note: limit parameter is reserved for future pagination implementation
    await this.getTeacherWithRelations(userId);

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getUpcomingEvents(userId: string, _days: number = 7): Promise<UpcomingEvent[]> {
    // Note: days parameter is reserved for future date range filtering
    await this.getTeacherWithRelations(userId);

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getTeacherPerformanceMetrics(_teacherId: string, _sessionId: string) {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getAttendanceRate(_teacherId: string, _sessionId: string, _termId?: string) {
    // This would typically calculate from attendance records
    // For now, we'll return mock data
    return 87.5;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getAssessmentCounts(_teacherId: string, _sessionId: string) {
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
      throw new NotFoundException('Class not found');
    }

    // Verify the teacher is the class teacher for this class
    if (classArmData.classTeacherId !== teacher.id) {
      throw new ForbiddenException('You are not the class teacher for this class');
    }

    // Calculate statistics
    const students = classArmData.students;
    const maleStudents = students.filter((s) => s.user.gender === 'MALE').length;
    const femaleStudents = students.filter((s) => s.user.gender === 'FEMALE').length;

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
      (attendance) => attendance.status === 'PRESENT',
    ).length;
    const attendanceRate =
      totalAttendanceRecords > 0 ? Math.round((presentRecords / totalAttendanceRecords) * 100) : 0;

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
      captain: classArmData.captain
        ? {
            id: classArmData.captain.id,
            name: `${classArmData.captain.user.firstName} ${classArmData.captain.user.lastName}`,
            studentNo: classArmData.captain.studentNo,
          }
        : undefined,
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
  async getClassStudents(
    userId: string,
    level: string,
    classArm: string,
  ): Promise<ClassStudentInfo[]> {
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
        classArmSubjectTeachers: {
          include: {
            subject: true,
            teacher: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!classArmData) {
      throw new NotFoundException('Class not found');
    }

    // Verify the teacher is either the class teacher OR teaches any subject in this class
    const isClassTeacher = classArmData.classTeacherId === teacher.id;
    const teachesAnySubject = (classArmData as any).classArmSubjectTeachers.some(
      (cast: any) => cast.teacherId === teacher.id,
    );

    if (!isClassTeacher && !teachesAnySubject) {
      const availableAssignments = (classArmData as any).classArmSubjectTeachers
        .map((cast: any) => `teacherId=${cast.teacherId}, subjectName=${cast.subject.name}`)
        .join('; ');

      throw new ForbiddenException(
        `You are not authorized to access this class's student information. ` +
          `You must be either the class teacher or assigned to teach any subject in this class. ` +
          `Looking for: teacherId=${teacher.id} in ${level}${classArm}. ` +
          `Class teacher: ${classArmData.classTeacherId || 'None assigned'}. ` +
          `Available subject assignments: ${availableAssignments}`,
      );
    }

    return classArmData.students.map((student) => {
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
        guardianName: student.guardian
          ? `${student.guardian.user.firstName} ${student.guardian.user.lastName}`
          : undefined,
        guardianPhone: student.guardian?.user.phone || undefined,
        guardianEmail: student.guardian?.user.email || undefined,
        admissionDate: student.admissionDate.toISOString(),
        status: student.status,
        avatarUrl: student.user.avatarUrl || undefined,
      };
    });
  }

  // Get subject assessment scores for a specific class
  async getSubjectAssessmentScores(
    userId: string,
    level: string,
    classArm: string,
    subjectName: string,
  ): Promise<SubjectAssessmentScores> {
    const teacher = await this.getTeacherWithRelations(userId);

    // Find the specific class arm in the current academic session
    const classArmData = await this.prisma.classArm.findFirst({
      where: {
        name: classArm,
        level: {
          name: level,
        },
        schoolId: teacher.user.schoolId,
        academicSession: {
          isCurrent: true,
        },
        deletedAt: null,
      },
      include: {
        level: true,
        students: {
          include: {
            user: true,
            subjectTermStudents: {
              where: {
                subjectTerm: {
                  subject: {
                    name: {
                      equals: subjectName,
                      mode: 'insensitive',
                    },
                  },
                  academicSession: {
                    isCurrent: true,
                  },
                },
              },
              include: {
                subjectTerm: {
                  include: {
                    subject: true,
                    academicSession: true,
                    term: true,
                  },
                },
                assessments: true,
              },
            },
          },
        },
        classArmSubjectTeachers: {
          where: {
            subject: {
              name: {
                equals: subjectName,
                mode: 'insensitive',
              },
            },
          },
          include: {
            subject: true,
            teacher: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!classArmData) {
      throw new NotFoundException('Class not found');
    }

    // Verify the teacher is either the class teacher OR teaches this subject in this class
    const isClassTeacher = classArmData.classTeacherId === teacher.id;
    const subjectTeacher = (classArmData as any).classArmSubjectTeachers.find(
      (cast: any) =>
        cast.teacherId === teacher.id &&
        cast.subject.name.toLowerCase() === subjectName.toLowerCase(),
    );

    if (!isClassTeacher && !subjectTeacher) {
      // Enhanced error message for debugging
      const availableAssignments = (classArmData as any).classArmSubjectTeachers
        .map((cast: any) => `teacherId=${cast.teacherId}, subjectName=${cast.subject.name}`)
        .join('; ');

      throw new ForbiddenException(
        `You are not authorized to access this subject's assessment scores. ` +
          `You must be either the class teacher or assigned to teach this subject. ` +
          `Looking for: teacherId=${teacher.id}, subjectName=${subjectName} in ${level}${classArm}. ` +
          `Class teacher: ${classArmData.classTeacherId || 'None assigned'}. ` +
          `Available subject assignments: ${availableAssignments}`,
      );
    }

    // Get school's grading model
    const gradingModel = await this.prisma.gradingModel.findUnique({
      where: { schoolId: teacher.user.schoolId },
    });

    // Process student assessment data
    const studentsWithScores = await Promise.all(
      (classArmData as any).students.map(async (student: any) => {
        const subjectTermStudent = student.subjectTermStudents[0];

        if (!subjectTermStudent) {
          return {
            id: student.id,
            studentNo: student.studentNo,
            fullName: `${student.user.firstName} ${student.user.lastName}`,
            gender: student.user.gender,
            assessments: [],
            totalScore: 0,
            averageScore: 0,
            grade: undefined,
          };
        }

        const assessments = await Promise.all(
          subjectTermStudent.assessments.map(async (assessment: any) => {
            // Calculate maxScore based on assessment type if not provided
            const maxScore =
              assessment.maxScore ||
              (await this.getMaxScoreForAssessmentType(assessment.name, teacher.user.schoolId));
            const percentage = maxScore > 0 ? Math.round((assessment.score / maxScore) * 100) : 0;

            return {
              id: assessment.id,
              name: assessment.name,
              score: assessment.score,
              maxScore: maxScore,
              percentage,
              isExam: assessment.isExam,
              date: assessment.createdAt.toISOString(),
            };
          }),
        );

        const totalScore = assessments.reduce((sum, assessment) => sum + assessment.score, 0);
        const totalMaxScore = assessments.reduce((sum, assessment) => sum + assessment.maxScore, 0);
        const averageScore =
          assessments.length > 0 ? Math.round(totalScore / assessments.length) : 0;
        const totalPercentage =
          totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

        return {
          id: student.id,
          studentNo: student.studentNo,
          fullName: `${student.user.firstName} ${student.user.lastName}`,
          gender: student.user.gender,
          assessments,
          totalScore,
          averageScore,
          grade: this.calculateGradeFromModel(totalPercentage, gradingModel?.model),
        };
      }),
    );

    // Calculate class statistics
    const validStudents = studentsWithScores.filter((s) => s.assessments.length > 0);
    const scores = validStudents.map((s) => s.averageScore);

    const classStats = {
      totalStudents: validStudents.length,
      averageScore:
        scores.length > 0
          ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
          : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      passRate:
        scores.length > 0
          ? Math.round((scores.filter((score) => score >= 50).length / scores.length) * 100)
          : 0,
    };

    // Get current academic session and term information
    const currentSession = await this.prisma.academicSession.findFirst({
      where: {
        isCurrent: true,
        schoolId: teacher.user.schoolId,
      },
      include: {
        terms: {
          where: {
            deletedAt: null,
            isCurrent: true,
          },
        },
      },
    });

    // Get current term using the isCurrent field
    const currentTerm = currentSession?.terms?.[0];

    return {
      subjectId: subjectTeacher.subject.id,
      subjectName: subjectTeacher.subject.name,
      teacher: {
        id: subjectTeacher.teacher.id,
        name: `${subjectTeacher.teacher.user.firstName} ${subjectTeacher.teacher.user.lastName}`,
      },
      academicSession: {
        id: currentSession?.id,
        name: currentSession?.academicYear,
        isCurrent: currentSession?.isCurrent,
      },
      currentTerm: {
        id: currentTerm?.id,
        name: currentTerm?.name,
      },
      classStats,
      students: studentsWithScores,
    };
  }

  private calculateGradeFromModel(score: number, gradingModel: any): string {
    if (!gradingModel || typeof gradingModel !== 'object') {
      // Fallback to default grading if no model is available
      if (score >= 90) return 'A+';
      if (score >= 80) return 'A';
      if (score >= 70) return 'B';
      if (score >= 60) return 'C';
      if (score >= 50) return 'D';
      return 'F';
    }

    // Iterate through the grading model to find the appropriate grade
    for (const [grade, range] of Object.entries(gradingModel)) {
      if (Array.isArray(range) && range.length === 2) {
        const [min, max] = range as [number, number];
        if (score >= min && score <= max) {
          return grade;
        }
      }
    }

    // If no grade is found in the model, return the lowest grade or 'F'
    return 'F';
  }

  private async getMaxScoreForAssessmentType(
    assessmentName: string,
    schoolId: string,
  ): Promise<number> {
    // First, try to find the assessment in the school's assessment structure
    const assessmentStructure = await this.prisma.assessmentStructure.findFirst({
      where: {
        schoolId,
        name: {
          equals: assessmentName,
          mode: 'insensitive',
        },
        isActive: true,
        deletedAt: null,
      },
    });

    if (assessmentStructure) {
      return assessmentStructure.maxScore;
    }

    // Fallback to default mapping for backward compatibility
    const assessmentType = assessmentName.toUpperCase();
    switch (assessmentType) {
      case 'TEST 1':
        return 20;
      case 'TEST 2':
        return 20;
      case 'EXAM':
        return 60;
      case 'CLASSWORK':
      case 'HOMEWORK':
        return 15;
      case 'QUIZ':
        return 20;
      case 'ASSIGNMENT':
        return 25;
      case 'PRACTICAL':
        return 30;
      case 'MID TERM TEST':
        return 40;
      case 'CONTINUOUS ASSESSMENT':
        return 20;
      case 'FINAL EXAMINATION':
        return 70;
      default:
        return 100; // Default max score
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getNextClassTime(_classId: string): string | undefined {
    // This would typically come from a schedule system
    // For now, we'll return mock data
    return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  }

  private async getSubjectAverageScore(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _subjectId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _sessionId: string,
  ): Promise<number | undefined> {
    // This would typically calculate from assessment scores
    // For now, we'll return mock data
    return 78.5;
  }

  // Student Assessment Score CRUD Operations - Temporarily disabled due to TypeScript decorator issues

  async createStudentAssessmentScore(userId: string, createDto: any): Promise<any> {
    // Get teacher and verify authorization
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId },
      include: { user: true },
    });

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    // Find the student
    const student = await this.prisma.student.findFirst({
      where: {
        id: createDto.studentId,
        user: { schoolId: teacher.user.schoolId },
      },
      include: {
        user: true,
        classArm: {
          include: {
            level: true,
            academicSession: true,
          },
        },
      },
    });

    if (!student) {
      throw new Error('Student not found or not in your school');
    }

    // Find the subject term
    const subjectTerm = await this.prisma.subjectTerm.findFirst({
      where: {
        subject: {
          name: {
            equals: createDto.subjectName,
            mode: 'insensitive',
          },
          schoolId: teacher.user.schoolId,
        },
        term: {
          name: {
            equals: createDto.termName,
            mode: 'insensitive',
          },
        },
        academicSession: {
          isCurrent: true,
          schoolId: teacher.user.schoolId,
        },
      },
      include: {
        subject: true,
        term: true,
        academicSession: true,
      },
    });

    if (!subjectTerm) {
      throw new Error('Subject term not found');
    }

    // Verify teacher is assigned to teach this subject in this class
    const classArmSubjectTeacher = await this.prisma.classArmSubjectTeacher.findFirst({
      where: {
        classArmId: student.classArmId,
        subjectId: subjectTerm.subjectId,
        teacherId: teacher.id,
      },
    });

    if (!classArmSubjectTeacher) {
      throw new Error('You are not authorized to teach this subject in this class');
    }

    // Get or create SubjectTermStudent record
    let subjectTermStudent = await this.prisma.subjectTermStudent.findFirst({
      where: {
        studentId: student.id,
        subjectTermId: subjectTerm.id,
      },
    });

    if (!subjectTermStudent) {
      subjectTermStudent = await this.prisma.subjectTermStudent.create({
        data: {
          studentId: student.id,
          subjectTermId: subjectTerm.id,
          totalScore: 0,
        },
      });
    }

    // Get assessment structure to determine isExam if not provided
    const assessmentStructure = await this.prisma.assessmentStructure.findFirst({
      where: {
        schoolId: teacher.user.schoolId,
        name: {
          equals: createDto.assessmentName,
          mode: 'insensitive',
        },
        isActive: true,
        deletedAt: null,
      },
    });

    const isExam =
      createDto.isExam !== undefined ? createDto.isExam : assessmentStructure?.isExam || false;

    // Create the assessment score
    const assessmentScore = await this.prisma.subjectTermStudentAssessment.create({
      data: {
        name: createDto.assessmentName,
        score: createDto.score,
        isExam,
        subjectTermStudentId: subjectTermStudent.id,
      },
    });

    // Update total score for the subject term student
    const allAssessments = await this.prisma.subjectTermStudentAssessment.findMany({
      where: {
        subjectTermStudentId: subjectTermStudent.id,
        deletedAt: null,
      },
    });

    const totalScore = allAssessments.reduce((sum, assessment) => sum + assessment.score, 0);

    await this.prisma.subjectTermStudent.update({
      where: { id: subjectTermStudent.id },
      data: { totalScore },
    });

    return {
      id: assessmentScore.id,
      name: assessmentScore.name,
      score: assessmentScore.score,
      isExam: assessmentScore.isExam,
      studentId: student.id,
      studentName: `${student.user.firstName} ${student.user.lastName}`,
      subjectName: subjectTerm.subject.name,
      termName: subjectTerm.term.name,
      createdAt: assessmentScore.createdAt,
    };
  }

  async updateStudentAssessmentScore(
    userId: string,
    assessmentId: string,
    updateDto: any,
  ): Promise<any> {
    // Get teacher and verify authorization
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId },
      include: { user: true },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Find the assessment and verify it belongs to the teacher's school
    const existingAssessment = await this.prisma.subjectTermStudentAssessment.findFirst({
      where: {
        id: assessmentId,
        deletedAt: null,
      },
      include: {
        subjectTermStudent: {
          include: {
            student: {
              include: { user: true },
            },
            subjectTerm: {
              include: {
                subject: true,
                term: true,
                academicSession: true,
              },
            },
          },
        },
      },
    });

    if (!existingAssessment) {
      throw new NotFoundException('Assessment score not found');
    }

    if (existingAssessment.subjectTermStudent.student.user.schoolId !== teacher.user.schoolId) {
      throw new ForbiddenException('Assessment score not found in your school');
    }

    // Verify teacher is assigned to teach this subject in this class
    const classArmSubjectTeacher = await this.prisma.classArmSubjectTeacher.findFirst({
      where: {
        classArmId: existingAssessment.subjectTermStudent.student.classArmId,
        subjectId: existingAssessment.subjectTermStudent.subjectTerm.subjectId,
        teacherId: teacher.id,
      },
    });

    if (!classArmSubjectTeacher) {
      throw new ForbiddenException('You are not authorized to modify this assessment score');
    }

    // Update the assessment score
    const updatedAssessment = await this.prisma.subjectTermStudentAssessment.update({
      where: { id: assessmentId },
      data: {
        ...(updateDto.score !== undefined && { score: updateDto.score }),
        ...(updateDto.assessmentName && { name: updateDto.assessmentName }),
        ...(updateDto.isExam !== undefined && { isExam: updateDto.isExam }),
      },
    });

    // Update total score for the subject term student
    const allAssessments = await this.prisma.subjectTermStudentAssessment.findMany({
      where: {
        subjectTermStudentId: existingAssessment.subjectTermStudentId,
        deletedAt: null,
      },
    });

    const totalScore = allAssessments.reduce((sum, assessment) => sum + assessment.score, 0);

    await this.prisma.subjectTermStudent.update({
      where: { id: existingAssessment.subjectTermStudentId },
      data: { totalScore },
    });

    return {
      id: updatedAssessment.id,
      name: updatedAssessment.name,
      score: updatedAssessment.score,
      isExam: updatedAssessment.isExam,
      studentId: existingAssessment.subjectTermStudent.student.id,
      studentName: `${existingAssessment.subjectTermStudent.student.user.firstName} ${existingAssessment.subjectTermStudent.student.user.lastName}`,
      subjectName: existingAssessment.subjectTermStudent.subjectTerm.subject.name,
      termName: existingAssessment.subjectTermStudent.subjectTerm.term.name,
      updatedAt: updatedAssessment.updatedAt,
    };
  }

  async deleteStudentAssessmentScore(userId: string, assessmentId: string): Promise<any> {
    // Get teacher and verify authorization
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId },
      include: { user: true },
    });

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    // Find the assessment and verify it belongs to the teacher's school
    const existingAssessment = await this.prisma.subjectTermStudentAssessment.findFirst({
      where: {
        id: assessmentId,
        deletedAt: null,
      },
      include: {
        subjectTermStudent: {
          include: {
            student: {
              include: { user: true },
            },
            subjectTerm: {
              include: {
                subject: true,
                term: true,
                academicSession: true,
              },
            },
          },
        },
      },
    });

    if (!existingAssessment) {
      throw new Error('Assessment score not found');
    }

    if (existingAssessment.subjectTermStudent.student.user.schoolId !== teacher.user.schoolId) {
      throw new Error('Assessment score not found in your school');
    }

    // Verify teacher is assigned to teach this subject in this class
    const classArmSubjectTeacher = await this.prisma.classArmSubjectTeacher.findFirst({
      where: {
        classArmId: existingAssessment.subjectTermStudent.student.classArmId,
        subjectId: existingAssessment.subjectTermStudent.subjectTerm.subjectId,
        teacherId: teacher.id,
      },
    });

    if (!classArmSubjectTeacher) {
      throw new Error('You are not authorized to delete this assessment score');
    }

    // Soft delete the assessment score
    await this.prisma.subjectTermStudentAssessment.update({
      where: { id: assessmentId },
      data: { deletedAt: new Date() },
    });

    // Update total score for the subject term student
    const allAssessments = await this.prisma.subjectTermStudentAssessment.findMany({
      where: {
        subjectTermStudentId: existingAssessment.subjectTermStudentId,
        deletedAt: null,
      },
    });

    const totalScore = allAssessments.reduce((sum, assessment) => sum + assessment.score, 0);

    await this.prisma.subjectTermStudent.update({
      where: { id: existingAssessment.subjectTermStudentId },
      data: { totalScore },
    });

    return {
      message: 'Assessment score deleted successfully',
      deletedAssessment: {
        id: existingAssessment.id,
        name: existingAssessment.name,
        score: existingAssessment.score,
        studentName: `${existingAssessment.subjectTermStudent.student.user.firstName} ${existingAssessment.subjectTermStudent.student.user.lastName}`,
        subjectName: existingAssessment.subjectTermStudent.subjectTerm.subject.name,
        termName: existingAssessment.subjectTermStudent.subjectTerm.term.name,
      },
    };
  }

  async bulkCreateStudentAssessmentScores(
    userId: string,
    bulkCreateDto: BulkCreateStudentAssessmentScoreDto,
  ): Promise<BulkStudentAssessmentScoreResult> {
    const { assessmentScores } = bulkCreateDto;
    const result: BulkStudentAssessmentScoreResult = {
      success: [],
      failed: [],
    };

    // Get teacher and verify authorization
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId },
      include: { user: true },
    });

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    // Process each assessment score
    for (const createDto of assessmentScores) {
      try {
        const assessmentScore = await this.createStudentAssessmentScore(userId, createDto);
        result.success.push(assessmentScore);
      } catch (error) {
        result.failed.push({
          assessmentScore: createDto,
          error: error.message || 'Creation failed',
        });
      }
    }

    return result;
  }

  async bulkUpdateStudentAssessmentScores(
    userId: string,
    bulkUpdateDto: BulkUpdateStudentAssessmentScoreDto,
  ): Promise<BulkStudentAssessmentScoreResult> {
    const { assessmentScores } = bulkUpdateDto;
    const result: BulkStudentAssessmentScoreResult = {
      success: [],
      failed: [],
    };

    // Get teacher and verify authorization
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId },
      include: { user: true },
    });

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    // Process each assessment score update
    for (const updateDto of assessmentScores) {
      try {
        const { id, ...updateData } = updateDto;
        const assessmentScore = await this.updateStudentAssessmentScore(userId, id, updateData);
        result.success.push(assessmentScore);
      } catch (error) {
        result.failed.push({
          assessmentScore: updateDto,
          error: error.message || 'Update failed',
        });
      }
    }

    return result;
  }

  async upsertStudentAssessmentScores(
    userId: string,
    upsertDto: UpsertStudentAssessmentScoreDto,
  ): Promise<BulkStudentAssessmentScoreResult> {
    const { assessmentScores, subjectName, termName, assessmentName } = upsertDto;
    const result: BulkStudentAssessmentScoreResult = {
      success: [],
      failed: [],
    };

    // Get teacher and verify authorization
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId },
      include: { user: true },
    });

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    // Process each assessment score
    for (const item of assessmentScores) {
      try {
        if (item.id) {
          // Update existing assessment score
          const { id, ...updateData } = item;
          const assessmentScore = await this.updateStudentAssessmentScore(userId, id, updateData);
          result.success.push(assessmentScore);
        } else {
          // Smart upsert: Check if assessment score already exists
          if (!item.studentId) {
            throw new Error('studentId is required for new assessment scores');
          }
          
          // Validate required fields for new scores
          if (!subjectName || !termName || !assessmentName) {
            throw new Error('subjectName, termName, and assessmentName are required for new assessment scores (must be provided at top level)');
          }

          // Check if assessment score already exists for this student/subject/term/assessment
          const existingAssessment = await this.findExistingAssessmentScore(
            item.studentId,
            subjectName,
            termName,
            assessmentName,
            teacher.user.schoolId
          );

          if (existingAssessment) {
            // Update existing assessment score
            const updateData = {
              score: item.score,
              assessmentName: assessmentName,
              isExam: item.isExam,
            };
            const assessmentScore = await this.updateStudentAssessmentScore(userId, existingAssessment.id, updateData);
            result.success.push(assessmentScore);
          } else {
            // Create new assessment score
            const createData = {
              studentId: item.studentId,
              subjectName: subjectName,
              termName: termName,
              assessmentName: assessmentName,
              score: item.score,
              isExam: item.isExam,
            };
            
            try {
              const assessmentScore = await this.createStudentAssessmentScore(userId, createData);
              result.success.push(assessmentScore);
            } catch (error) {
              // Handle database constraint violation
              if (error.code === 'P2002' && error.meta?.target?.includes('unique_assessment_per_student_term')) {
                throw new Error('Assessment score already exists for this student. Use update instead of create.');
              }
              throw error;
            }
          }
        }
      } catch (error) {
        result.failed.push({
          assessmentScore: item,
          error: error.message || 'Operation failed',
        });
      }
    }

    return result;
  }

  private async findExistingAssessmentScore(
    studentId: string,
    subjectName: string,
    termName: string,
    assessmentName: string,
    schoolId: string,
  ) {
    // Find the subject term
    const subjectTerm = await this.prisma.subjectTerm.findFirst({
      where: {
        subject: {
          name: {
            equals: subjectName,
            mode: 'insensitive',
          },
          schoolId: schoolId,
        },
        term: {
          name: {
            equals: termName,
            mode: 'insensitive',
          },
        },
        academicSession: {
          isCurrent: true,
          schoolId: schoolId,
        },
      },
    });

    if (!subjectTerm) {
      return null;
    }

    // Find the subject term student
    const subjectTermStudent = await this.prisma.subjectTermStudent.findFirst({
      where: {
        studentId: studentId,
        subjectTermId: subjectTerm.id,
      },
    });

    if (!subjectTermStudent) {
      return null;
    }

    // Find existing assessment score
    const existingAssessment = await this.prisma.subjectTermStudentAssessment.findFirst({
      where: {
        subjectTermStudentId: subjectTermStudent.id,
        name: {
          equals: assessmentName,
          mode: 'insensitive',
        },
        deletedAt: null,
      },
    });

    return existingAssessment;
  }
}
