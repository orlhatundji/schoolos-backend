import { Injectable } from '@nestjs/common';

import { BaseService } from '../../../common/base-service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  StudentAttendanceData,
  StudentDashboardData,
  StudentProfileData,
  StudentResultsData,
  StudentSubjectData,
} from './types';

@Injectable()
export class StudentService extends BaseService {
  constructor(private readonly prisma: PrismaService) {
    super(StudentService.name);
  }

  async getStudentDashboardData(userId: string): Promise<StudentDashboardData> {
    // Get student with related data
    const student = await this.prisma.student.findFirst({
      where: { userId },
      include: {
        user: true,
        classArm: {
          include: {
            level: true,
          },
        },
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Get current academic session and term
    const currentSession = await this.prisma.academicSession.findFirst({
      where: { isCurrent: true, schoolId: student.user.schoolId },
    });

    const currentTerm = await this.prisma.term.findFirst({
      where: {
        academicSessionId: currentSession?.id,
        isCurrent: true,
      },
    });

    // Get student statistics
    const subjectTermStudents = await this.prisma.subjectTermStudent.findMany({
      where: {
        studentId: student.id,
        subjectTerm: {
          termId: currentTerm?.id,
        },
      },
      include: {
        assessments: true,
      },
    });

    // Calculate statistics
    const totalSubjects = subjectTermStudents.length;
    const totalScore = subjectTermStudents.reduce((sum, sts) => sum + sts.totalScore, 0);
    const averageScore = totalSubjects > 0 ? totalScore / totalSubjects : 0;
    const totalAssessments = subjectTermStudents.reduce(
      (sum, sts) => sum + sts.assessments.length,
      0,
    );

    // Get attendance rate for current term
    const attendanceRecords = await this.prisma.studentAttendance.findMany({
      where: {
        studentId: student.id,
        termId: currentTerm?.id,
      },
    });

    const presentDays = attendanceRecords.filter((record) => record.status === 'PRESENT').length;
    const attendanceRate =
      attendanceRecords.length > 0 ? (presentDays / attendanceRecords.length) * 100 : 0;

    // Get recent activities (last 5 assessments)
    const recentAssessments = await this.prisma.subjectTermStudentAssessment.findMany({
      where: {
        subjectTermStudent: {
          studentId: student.id,
        },
      },
      include: {
        subjectTermStudent: {
          include: {
            subjectTerm: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentActivities = recentAssessments.map((assessment) => ({
      id: assessment.id,
      type: 'ASSESSMENT' as const,
      title: assessment.name,
      description: `Scored ${assessment.score}`,
      date: assessment.createdAt,
      subjectName: assessment.subjectTermStudent.subjectTerm.subject.name,
    }));

    // Get upcoming events (exams in the next 30 days)
    const upcomingExams = await this.prisma.subjectTermStudentAssessment.findMany({
      where: {
        subjectTermStudent: {
          studentId: student.id,
        },
        isExam: true,
        createdAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      },
      include: {
        subjectTermStudent: {
          include: {
            subjectTerm: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });

    const upcomingEvents = upcomingExams.map((exam) => ({
      id: exam.id,
      title: `${exam.subjectTermStudent.subjectTerm.subject.name} Exam`,
      description: exam.name,
      date: exam.createdAt,
      type: 'EXAM' as const,
    }));

    return {
      student: {
        id: student.id,
        studentNo: student.studentNo,
        fullName: `${student.user.firstName} ${student.user.lastName}`,
        avatarUrl: student.user.avatarUrl,
        classArm: {
          id: student.classArm.id,
          name: student.classArm.name,
          level: {
            id: student.classArm.level.id,
            name: student.classArm.level.name,
          },
        },
      },
      academicInfo: {
        currentSession: currentSession
          ? {
              id: currentSession.id,
              academicYear: currentSession.academicYear,
              isCurrent: currentSession.isCurrent,
            }
          : null,
        currentTerm: currentTerm
          ? {
              id: currentTerm.id,
              name: currentTerm.name,
              startDate: currentTerm.createdAt,
              endDate: currentTerm.updatedAt,
            }
          : null,
      },
      statistics: {
        totalSubjects,
        averageScore: Math.round(averageScore * 100) / 100,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        totalAssessments,
      },
      recentActivities,
      upcomingEvents,
    };
  }

  async getStudentResults(
    userId: string,
    academicSessionId?: string,
    termId?: string,
    subjectId?: string,
  ): Promise<StudentResultsData> {
    const student = await this.prisma.student.findFirst({
      where: { userId },
      include: {
        user: true,
        classArm: {
          include: {
            level: true,
          },
        },
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Get academic session and term
    let session = null;
    let term = null;

    if (academicSessionId) {
      session = await this.prisma.academicSession.findUnique({
        where: { id: academicSessionId },
      });
    } else {
      session = await this.prisma.academicSession.findFirst({
        where: { isCurrent: true, schoolId: student.user.schoolId },
      });
    }

    if (termId) {
      term = await this.prisma.term.findUnique({
        where: { id: termId },
      });
    } else if (session) {
      term = await this.prisma.term.findFirst({
        where: {
          academicSessionId: session.id,
          isCurrent: true,
        },
      });
    }

    if (!session || !term) {
      throw new Error('Academic session or term not found');
    }

    // Get subject term students with assessments
    const whereClause: any = {
      studentId: student.id,
      subjectTerm: {
        termId: term.id,
      },
    };

    if (subjectId) {
      whereClause.subjectTerm.subjectId = subjectId;
    }

    const subjectTermStudents = await this.prisma.subjectTermStudent.findMany({
      where: whereClause,
      include: {
        subjectTerm: {
          include: {
            subject: true,
          },
        },
        assessments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Get assessment structures for the school to get correct maxScore values
    const assessmentStructures = await this.prisma.assessmentStructure.findMany({
      where: {
        schoolId: student.user.schoolId,
        isActive: true,
      },
    });

    // Create a map for quick lookup of maxScore by assessment name
    const assessmentStructureMap = new Map();
    assessmentStructures.forEach((structure) => {
      assessmentStructureMap.set(structure.name, structure.maxScore);
    });

    // Calculate subject results
    const subjects = subjectTermStudents.map((sts) => {
      const assessments = sts.assessments.map((assessment) => {
        const maxScore = assessmentStructureMap.get(assessment.name) || 100;
        return {
          id: assessment.id,
          name: assessment.name,
          score: assessment.score,
          maxScore: maxScore,
          isExam: assessment.isExam,
          date: assessment.createdAt,
        };
      });

      return {
        id: sts.subjectTerm.subject.id,
        name: sts.subjectTerm.subject.name,
        code: sts.subjectTerm.subject.name.substring(0, 3).toUpperCase(),
        totalScore: sts.totalScore,
        averageScore: sts.totalScore,
        grade: this.calculateGrade(sts.totalScore),
        assessments,
      };
    });

    // Calculate overall statistics
    const totalSubjects = subjects.length;
    const totalScore = subjects.reduce((sum, subject) => sum + subject.totalScore, 0);
    const averageScore = totalSubjects > 0 ? totalScore / totalSubjects : 0;

    // Get class position (simplified - would need more complex logic in real implementation)
    const allClassStudents = await this.prisma.subjectTermStudent.findMany({
      where: {
        subjectTerm: {
          termId: term.id,
        },
      },
      include: {
        student: {
          include: {
            classArm: true,
          },
        },
      },
    });

    const classStudents = allClassStudents.filter(
      (sts) => sts.student.classArmId === student.classArmId,
    );

    const sortedStudents = classStudents.sort((a, b) => b.totalScore - a.totalScore);
    const position = sortedStudents.findIndex((sts) => sts.studentId === student.id) + 1;

    return {
      student: {
        id: student.id,
        studentNo: student.studentNo,
        fullName: `${student.user.firstName} ${student.user.lastName}`,
        classArm: {
          id: student.classArm.id,
          name: student.classArm.name,
          level: {
            id: student.classArm.level.id,
            name: student.classArm.level.name,
          },
        },
      },
      academicSession: {
        id: session.id,
        academicYear: session.academicYear,
        isCurrent: session.isCurrent,
      },
      term: {
        id: term.id,
        name: term.name,
        startDate: term.startDate,
        endDate: term.endDate,
      },
      subjects,
      overallStats: {
        totalSubjects,
        totalScore,
        averageScore: Math.round(averageScore * 100) / 100,
        position,
        totalStudents: classStudents.length,
        grade: this.calculateGrade(averageScore),
      },
    };
  }

  async getStudentProfile(userId: string): Promise<StudentProfileData> {
    const student = await this.prisma.student.findFirst({
      where: { userId },
      include: {
        user: true,
        classArm: {
          include: {
            level: true,
          },
        },
        guardian: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    return {
      student: {
        id: student.id,
        studentNo: student.studentNo,
        admissionNo: student.admissionNo,
        admissionDate: student.admissionDate,
        status: student.status,
      },
      user: {
        id: student.user.id,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        email: student.user.email,
        phone: student.user.phone,
        gender: student.user.gender,
        dateOfBirth: student.user.dateOfBirth,
        avatarUrl: student.user.avatarUrl,
      },
      classArm: {
        id: student.classArm.id,
        name: student.classArm.name,
        level: {
          id: student.classArm.level.id,
          name: student.classArm.level.name,
        },
      },
      guardian: student.guardian
        ? {
            id: student.guardian.id,
            firstName: student.guardian.user.firstName,
            lastName: student.guardian.user.lastName,
            email: student.guardian.user.email,
            phone: student.guardian.user.phone,
            relationship: 'Parent', // Default relationship since it's not in the schema
          }
        : undefined,
    };
  }

  async getStudentAttendance(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<StudentAttendanceData> {
    const student = await this.prisma.student.findFirst({
      where: { userId },
      include: {
        user: true,
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    const whereClause: any = {
      studentId: student.id,
    };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const attendanceRecords = await this.prisma.studentAttendance.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
    });

    const attendance = attendanceRecords.map((record) => ({
      date: record.date,
      status: record.status,
      subjectName: undefined, // Subject not available in current schema
      remarks: undefined, // Remarks not available in current schema
    }));

    // Calculate statistics
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter((record) => record.status === 'PRESENT').length;
    const absentDays = attendanceRecords.filter((record) => record.status === 'ABSENT').length;
    const lateDays = attendanceRecords.filter((record) => record.status === 'LATE').length;
    const excusedDays = attendanceRecords.filter((record) => record.status === 'EXCUSED').length;
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return {
      student: {
        id: student.id,
        studentNo: student.studentNo,
        fullName: `${student.user.firstName} ${student.user.lastName}`,
      },
      attendance,
      statistics: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        excusedDays,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
      },
      period: {
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(),
      },
    };
  }

  async getStudentSubjects(
    userId: string,
    academicSessionId?: string,
    termId?: string,
  ): Promise<StudentSubjectData[]> {
    const student = await this.prisma.student.findFirst({
      where: { userId },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Get academic session and term
    let session = null;
    let term = null;

    if (academicSessionId) {
      session = await this.prisma.academicSession.findUnique({
        where: { id: academicSessionId },
      });
    } else {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      session = await this.prisma.academicSession.findFirst({
        where: { isCurrent: true, schoolId: user.schoolId },
      });
    }

    if (termId) {
      term = await this.prisma.term.findUnique({
        where: { id: termId },
      });
    } else if (session) {
      term = await this.prisma.term.findFirst({
        where: {
          academicSessionId: session.id,
          isCurrent: true,
        },
      });
    }

    if (!session || !term) {
      throw new Error('Academic session or term not found');
    }

    const subjectTermStudents = await this.prisma.subjectTermStudent.findMany({
      where: {
        studentId: student.id,
        subjectTerm: {
          termId: term.id,
        },
      },
      include: {
        subjectTerm: {
          include: {
            subject: {
              include: {
                classArmSubjectTeachers: {
                  include: {
                    teacher: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        assessments: true,
      },
    });

    return subjectTermStudents.map((sts) => {
      const teacher = sts.subjectTerm.subject.classArmSubjectTeachers[0]?.teacher;
      const totalAssessments = sts.assessments.length;
      const completedAssessments = sts.assessments.filter((a) => a.score > 0).length;

      return {
        id: sts.subjectTerm.subject.id,
        name: sts.subjectTerm.subject.name,
        code: sts.subjectTerm.subject.name.substring(0, 3).toUpperCase(),
        teacher: teacher
          ? {
              id: teacher.id,
              firstName: teacher.user.firstName,
              lastName: teacher.user.lastName,
            }
          : null,
        academicSession: {
          id: session.id,
          academicYear: session.academicYear,
        },
        term: {
          id: term.id,
          name: term.name,
        },
        enrollmentDate: sts.createdAt,
        currentScore: sts.totalScore,
        averageScore: sts.totalScore,
        grade: this.calculateGrade(sts.totalScore),
        totalAssessments,
        completedAssessments,
      };
    });
  }

  private calculateGrade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }
}
