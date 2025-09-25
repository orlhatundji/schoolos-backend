import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';

import { BaseService } from '../../../common/base-service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaystackService } from '../../../shared/services/paystack.service';
import {
  StudentAttendanceData,
  StudentDashboardData,
  StudentPaymentData,
  StudentPaymentHistoryData,
  StudentPaymentSummaryData,
  StudentProfileData,
  StudentResultsData,
  StudentSubjectData,
} from './types';

@Injectable()
export class StudentService extends BaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
  ) {
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

    // Get recent payment activities (last 5)
    const recentPaymentActivities = await this.prisma.userActivity.findMany({
      where: {
        userId: userId,
        entityType: 'PAYMENT',
        action: {
          in: ['PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'TRANSFER_SUCCESS', 'TRANSFER_FAILED'],
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 5,
    });

    const paymentActivities = recentPaymentActivities.map((activity) => {
      const details = activity.details as any;
      const amount = details?.amount || 0;
      const currency = details?.currency || 'NGN';
      
      let title = '';
      let description = '';
      
      switch (activity.action) {
        case 'PAYMENT_COMPLETED':
          title = 'Payment Completed';
          description = `Payment of ₦${amount.toLocaleString()} completed successfully`;
          break;
        case 'PAYMENT_FAILED':
          title = 'Payment Failed';
          description = `Payment of ₦${amount.toLocaleString()} failed`;
          break;
        case 'TRANSFER_SUCCESS':
          title = 'Refund Processed';
          description = `Refund of ₦${amount.toLocaleString()} processed successfully`;
          break;
        case 'TRANSFER_FAILED':
          title = 'Refund Failed';
          description = `Refund of ₦${amount.toLocaleString()} failed`;
          break;
        default:
          title = 'Payment Activity';
          description = activity.description || 'Payment activity recorded';
      }

      return {
        id: activity.id,
        type: 'PAYMENT' as const,
        title,
        description,
        date: activity.timestamp,
        amount,
        currency,
      };
    });

    // Combine and sort all activities by date (most recent first)
    const allActivities = [...recentActivities, ...paymentActivities]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10); // Take the 10 most recent activities

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
      recentActivities: allActivities,
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

    // Get academic session and term with proper validation
    let session = null;
    let term = null;

    if (academicSessionId) {
      session = await this.prisma.academicSession.findFirst({
        where: {
          id: academicSessionId,
          schoolId: student.user.schoolId, // Ensure session belongs to student's school
        },
      });

      if (!session) {
        throw new Error(
          `Academic session with ID ${academicSessionId} not found or does not belong to this school`,
        );
      }
    } else {
      // Try to find current session first, then fallback to most recent
      session = await this.prisma.academicSession.findFirst({
        where: { isCurrent: true, schoolId: student.user.schoolId },
      });

      if (!session) {
        session = await this.prisma.academicSession.findFirst({
          where: { schoolId: student.user.schoolId },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (!session) {
        throw new Error('No academic session found for this school');
      }
    }

    if (termId) {
      term = await this.prisma.term.findFirst({
        where: {
          id: termId,
          academicSessionId: session.id, // Ensure term belongs to the session
        },
      });

      if (!term) {
        throw new Error(
          `Term with ID ${termId} not found or does not belong to the selected academic session`,
        );
      }
    } else {
      // Try to find current term first, then fallback to most recent
      term = await this.prisma.term.findFirst({
        where: {
          academicSessionId: session.id,
          isCurrent: true,
        },
      });

      if (!term) {
        term = await this.prisma.term.findFirst({
          where: {
            academicSessionId: session.id,
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (!term) {
        throw new Error(`No terms found for academic session ${session.academicYear}`);
      }
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
      orderBy: { order: 'asc' },
    });

    // Create a map for quick lookup of maxScore by assessment name
    const assessmentStructureMap = new Map();
    assessmentStructures.forEach((structure) => {
      assessmentStructureMap.set(structure.name, structure.maxScore);
    });

    // Calculate subject results
    const subjects = subjectTermStudents.map((sts) => {
      // Create a map of student assessments by name for quick lookup
      const studentAssessmentsMap = new Map();
      sts.assessments.forEach((assessment) => {
        studentAssessmentsMap.set(assessment.name, assessment);
      });

      // Order assessments according to assessment structure order
      const orderedAssessments = assessmentStructures.map((structure) => {
        const studentAssessment = studentAssessmentsMap.get(structure.name);
        if (studentAssessment) {
          return {
            id: studentAssessment.id,
            name: structure.name,
            score: studentAssessment.score,
            maxScore: structure.maxScore,
            isExam: structure.isExam,
            date: studentAssessment.createdAt,
          };
        } else {
          // Return structure even if student doesn't have this assessment
          return {
            id: null,
            name: structure.name,
            score: 0,
            maxScore: structure.maxScore,
            isExam: structure.isExam,
            date: null,
          };
        }
      });

      return {
        id: sts.subjectTerm.subject.id,
        name: sts.subjectTerm.subject.name,
        code: sts.subjectTerm.subject.name.substring(0, 3).toUpperCase(),
        totalScore: sts.totalScore,
        averageScore: sts.totalScore,
        grade: this.calculateGrade(sts.totalScore),
        assessments: orderedAssessments,
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

  async getStudentAcademicSessions(userId: string) {
    const student = await this.prisma.student.findFirst({
      where: { userId },
      include: {
        user: true,
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Get academic sessions where student was enrolled (through classArm or subjectTermStudent)
    // Include associated terms where student was enrolled
    const sessions = await this.prisma.academicSession.findMany({
      where: {
        schoolId: student.user.schoolId,
        OR: [
          // Sessions where student was in a class arm
          {
            classArms: {
              some: {
                students: {
                  some: {
                    id: student.id,
                  },
                },
              },
            },
          },
          // Sessions where student was enrolled in subjects
          {
            subjectTerms: {
              some: {
                subjectTermStudents: {
                  some: {
                    studentId: student.id,
                  },
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        academicYear: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
        createdAt: true,
        terms: {
          where: {
            subjectTerms: {
              some: {
                subjectTermStudents: {
                  some: {
                    studentId: student.id,
                  },
                },
              },
            },
          },
          select: {
            id: true,
            name: true,
            isCurrent: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((session) => ({
      id: session.id,
      academicYear: session.academicYear,
      startDate: session.startDate,
      endDate: session.endDate,
      isCurrent: session.isCurrent,
      createdAt: session.createdAt,
      terms: session.terms.map((term) => ({
        id: term.id,
        name: term.name,
        isCurrent: term.isCurrent,
        createdAt: term.createdAt,
      })),
    }));
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

  // Payment-related methods
  async getStudentPayments(userId: string): Promise<StudentPaymentData[]> {
    const student = await this.getStudentByUserId(userId);
    
    const payments = await this.prisma.studentPayment.findMany({
      where: {
        studentId: student.id,
        deletedAt: null,
      },
      include: {
        paymentStructure: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    return payments.map(payment => ({
      id: payment.id,
      studentId: payment.studentId,
      paymentStructureId: payment.paymentStructureId,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status as any,
      dueDate: payment.dueDate,
      paidAmount: Number(payment.paidAmount),
      paidAt: payment.paidAt,
      notes: payment.notes,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      paymentStructure: {
        id: payment.paymentStructure.id,
        name: payment.paymentStructure.name,
        description: payment.paymentStructure.description,
        category: payment.paymentStructure.category,
        frequency: payment.paymentStructure.frequency,
      },
    }));
  }

  async getStudentPaymentSummary(userId: string): Promise<StudentPaymentSummaryData> {
    const student = await this.getStudentByUserId(userId);
    
    const payments = await this.prisma.studentPayment.findMany({
      where: {
        studentId: student.id,
        deletedAt: null,
      },
    });

    const summary = payments.reduce(
      (acc, payment) => {
        const amount = Number(payment.amount);
        const paidAmount = Number(payment.paidAmount);
        const outstanding = amount - paidAmount;
        const isOverdue = payment.dueDate < new Date() && payment.status !== 'PAID';

        acc.totalPayments++;
        acc.totalPaid += paidAmount;
        acc.statusCounts[payment.status]++;

        if (payment.status === 'PENDING' || payment.status === 'PARTIAL') {
          acc.pendingAmount += outstanding;
          acc.pendingCount++;
        }

        if (isOverdue && payment.status !== 'PAID') {
          acc.overdueAmount += outstanding;
          acc.overdueCount++;
        }

        acc.totalOutstanding += outstanding;

        return acc;
      },
      {
        totalOutstanding: 0,
        totalPaid: 0,
        overdueAmount: 0,
        pendingAmount: 0,
        totalPayments: 0,
        overdueCount: 0,
        pendingCount: 0,
        statusCounts: {
          PENDING: 0,
          PAID: 0,
          PARTIAL: 0,
          OVERDUE: 0,
          WAIVED: 0,
        },
      },
    );

    return summary;
  }

  async getStudentPaymentHistory(userId: string): Promise<StudentPaymentHistoryData[]> {
    const student = await this.getStudentByUserId(userId);
    
    const payments = await this.prisma.studentPayment.findMany({
      where: {
        studentId: student.id,
        deletedAt: null,
        status: {
          in: ['PAID', 'PARTIAL'],
        },
      },
      include: {
        paymentStructure: true,
      },
      orderBy: {
        paidAt: 'desc',
      },
    });

    return payments.map(payment => ({
      id: payment.id,
      amount: Number(payment.amount),
      paidAmount: Number(payment.paidAmount),
      status: payment.status as any,
      dueDate: payment.dueDate,
      paidAt: payment.paidAt,
      paymentStructure: {
        name: payment.paymentStructure.name,
        category: payment.paymentStructure.category,
      },
    }));
  }

  async getOutstandingPayments(userId: string): Promise<StudentPaymentData[]> {
    const student = await this.getStudentByUserId(userId);
    
    const payments = await this.prisma.studentPayment.findMany({
      where: {
        studentId: student.id,
        deletedAt: null,
        status: {
          in: ['PENDING', 'PARTIAL', 'OVERDUE'],
        },
      },
      include: {
        paymentStructure: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    return payments.map(payment => ({
      id: payment.id,
      studentId: payment.studentId,
      paymentStructureId: payment.paymentStructureId,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status as any,
      dueDate: payment.dueDate,
      paidAmount: Number(payment.paidAmount),
      paidAt: payment.paidAt,
      notes: payment.notes,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      paymentStructure: {
        id: payment.paymentStructure.id,
        name: payment.paymentStructure.name,
        description: payment.paymentStructure.description,
        category: payment.paymentStructure.category,
        frequency: payment.paymentStructure.frequency,
      },
    }));
  }

  async initiatePayment(userId: string, paymentId: string, amount?: number): Promise<{ authorization_url: string; access_code: string; reference: string }> {
    const student = await this.getStudentByUserId(userId);
    
    // Get the payment record
    const payment = await this.prisma.studentPayment.findFirst({
      where: {
        id: paymentId,
        studentId: student.id,
        deletedAt: null,
        status: {
          in: ['PENDING', 'PARTIAL', 'OVERDUE'],
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found or not available for payment');
    }

    // Calculate payment amount
    const paymentAmount = amount || (Number(payment.amount) - Number(payment.paidAmount));
    
    if (paymentAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    // Generate reference
    const reference = this.paystackService.generateReference('STU_PAY');

    // Initialize payment with Paystack
    const paystackResponse = await this.paystackService.initializePayment({
      amount: this.paystackService.convertToKobo(paymentAmount),
      email: student.user.email || `${student.studentNo}@school.com`,
      reference,
      metadata: {
        studentId: student.id,
        paymentId: payment.id,
        studentNo: student.studentNo,
        paymentStructureId: payment.paymentStructureId,
      },
    });

    // Store payment reference in database for verification
    await this.prisma.studentPayment.update({
      where: { id: paymentId },
      data: {
        notes: `Payment initiated with reference: ${reference}`,
      },
    });

    return {
      authorization_url: paystackResponse.data.authorization_url,
      access_code: paystackResponse.data.access_code,
      reference: paystackResponse.data.reference,
    };
  }

  async verifyPayment(userId: string, reference: string): Promise<{ success: boolean; message: string; payment?: StudentPaymentData }> {
    const student = await this.getStudentByUserId(userId);
    
    try {
      // Verify payment with Paystack
      const paystackResponse = await this.paystackService.verifyPayment(reference);
      
      if (paystackResponse.data.status !== 'success') {
        return {
          success: false,
          message: 'Payment verification failed',
        };
      }

      const paymentData = paystackResponse.data;
      const amountPaid = this.paystackService.convertFromKobo(paymentData.amount);
      
      // Find the payment record
      const payment = await this.prisma.studentPayment.findFirst({
        where: {
          studentId: student.id,
          notes: {
            contains: reference,
          },
          deletedAt: null,
        },
        include: {
          paymentStructure: true,
        },
      });

      if (!payment) {
        return {
          success: false,
          message: 'Payment record not found',
        };
      }

      // Update payment status
      const newPaidAmount = Number(payment.paidAmount) + amountPaid;
      const totalAmount = Number(payment.amount);
      const newStatus = newPaidAmount >= totalAmount ? 'PAID' : 'PARTIAL';

      const updatedPayment = await this.prisma.studentPayment.update({
        where: { id: payment.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
          paidAt: new Date(),
          notes: `Payment verified via Paystack. Reference: ${reference}. Amount: ${amountPaid}`,
        },
        include: {
          paymentStructure: true,
        },
      });

      return {
        success: true,
        message: 'Payment verified successfully',
        payment: {
          id: updatedPayment.id,
          studentId: updatedPayment.studentId,
          paymentStructureId: updatedPayment.paymentStructureId,
          amount: Number(updatedPayment.amount),
          currency: updatedPayment.currency,
          status: updatedPayment.status as any,
          dueDate: updatedPayment.dueDate,
          paidAmount: Number(updatedPayment.paidAmount),
          paidAt: updatedPayment.paidAt,
          notes: updatedPayment.notes,
          createdAt: updatedPayment.createdAt,
          updatedAt: updatedPayment.updatedAt,
          paymentStructure: {
            id: updatedPayment.paymentStructure.id,
            name: updatedPayment.paymentStructure.name,
            description: updatedPayment.paymentStructure.description,
            category: updatedPayment.paymentStructure.category,
            frequency: updatedPayment.paymentStructure.frequency,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Payment verification failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: 'Payment verification failed',
      };
    }
  }

  private async getStudentByUserId(userId: string) {
    const student = await this.prisma.student.findFirst({
      where: { userId },
      include: {
        user: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }
}
