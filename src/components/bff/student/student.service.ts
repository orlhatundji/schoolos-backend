import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';

import { BaseService } from '../../../common/base-service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaystackService } from '../../../shared/services/paystack.service';
import { FeeCalculationService } from '../../../shared/services/fee-calculation.service';
import { AssessmentStructureTemplateService } from '../../assessment-structures/assessment-structure-template.service';
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
    private readonly feeCalculationService: FeeCalculationService,
    private readonly templateService: AssessmentStructureTemplateService,
  ) {
    super(StudentService.name);
  }

  async getStudentDashboardData(userId: string): Promise<StudentDashboardData> {
    // Get student with related data
    const student = await this.prisma.student.findFirst({
      where: { userId },
      include: {
        user: true,
        classArmStudents: {
          where: { isActive: true },
          include: {
            classArm: {
              include: {
                level: true,
              },
            },
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

    // Get student assessments for the current term
    const assessments = await this.prisma.classArmStudentAssessment.findMany({
      where: {
        studentId: student.id,
        termId: currentTerm?.id,
        deletedAt: null,
      },
      include: {
        classArmSubject: {
          include: {
            subject: true,
          },
        },
      },
    });

    // Group assessments by subject to compute per-subject totals
    const subjectAssessmentsMap = new Map<string, { subject: any; assessments: typeof assessments }>();
    for (const a of assessments) {
      const subjectId = a.classArmSubject.subject.id;
      if (!subjectAssessmentsMap.has(subjectId)) {
        subjectAssessmentsMap.set(subjectId, { subject: a.classArmSubject.subject, assessments: [] });
      }
      subjectAssessmentsMap.get(subjectId).assessments.push(a);
    }

    // Calculate statistics
    const totalSubjects = subjectAssessmentsMap.size;
    const totalScore = assessments.reduce((sum, a) => sum + a.score, 0);
    const subjectTotals = Array.from(subjectAssessmentsMap.values()).map(
      (entry) => entry.assessments.reduce((sum, a) => sum + a.score, 0),
    );
    const averageScore = totalSubjects > 0
      ? subjectTotals.reduce((sum, t) => sum + t, 0) / totalSubjects
      : 0;
    const totalAssessments = assessments.length;

    // Get attendance rate for current term
    const attendanceRecords = await this.prisma.studentAttendance.findMany({
      where: {
        classArmStudent: {
          studentId: student.id,
        },
        termId: currentTerm?.id,
      },
    });

    const presentDays = attendanceRecords.filter((record) => record.status === 'PRESENT').length;
    const attendanceRate =
      attendanceRecords.length > 0 ? (presentDays / attendanceRecords.length) * 100 : 0;

    // Get recent activities (last 5 assessments)
    const recentAssessments = await this.prisma.classArmStudentAssessment.findMany({
      where: {
        studentId: student.id,
        deletedAt: null,
      },
      include: {
        classArmSubject: {
          include: {
            subject: true,
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
      subjectName: assessment.classArmSubject.subject.name,
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
    const upcomingExams = await this.prisma.classArmStudentAssessment.findMany({
      where: {
        studentId: student.id,
        deletedAt: null,
        isExam: true,
        createdAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      },
      include: {
        classArmSubject: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });

    const upcomingEvents = upcomingExams.map((exam) => ({
      id: exam.id,
      title: `${exam.classArmSubject.subject.name} Exam`,
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
          id: student.classArmStudents?.[0]?.classArm?.id || '',
          name: student.classArmStudents?.[0]?.classArm?.name || 'N/A',
          level: {
            id: student.classArmStudents?.[0]?.classArm?.level?.id || '',
            name: student.classArmStudents?.[0]?.classArm?.level?.name || 'N/A',
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
        classArmStudents: {
          where: { isActive: true },
          include: {
            classArm: {
              include: {
                level: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Fetch school details for the report card header
    const school = await this.prisma.school.findUnique({
      where: { id: student.user.schoolId },
      include: { primaryAddress: true },
    });

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

    const assessmentWhereClause: any = {
      studentId: student.id,
      termId: term.id,
      deletedAt: null,
    };

    if (subjectId) {
      assessmentWhereClause.classArmSubject = { subjectId };
    }

    const allAssessments = await this.prisma.classArmStudentAssessment.findMany({
      where: assessmentWhereClause,
      include: {
        classArmSubject: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group assessments by subject
    const bySubjectId = new Map<string, { subject: any; assessments: typeof allAssessments; totalScore: number }>();
    for (const a of allAssessments) {
      const sid = a.classArmSubject.subject.id;
      const existing = bySubjectId.get(sid);
      if (!existing) {
        bySubjectId.set(sid, { subject: a.classArmSubject.subject, assessments: [a], totalScore: a.score });
      } else {
        existing.assessments.push(a);
        existing.totalScore += a.score;
      }
    }
    const subjectEntries = Array.from(bySubjectId.values());

    // Get assessment structures from the session's own template.
    // For historical sessions, use read-only lookup to avoid fabricating a template
    // from the current session's structure. Only auto-create for the current session.
    const template = session.isCurrent
      ? await this.templateService.findActiveTemplateForSchoolSession(
          student.user.schoolId,
          session.id,
        )
      : await this.templateService.findTemplateForSessionReadOnly(
          student.user.schoolId,
          session.id,
        );

    if (!template) {
      throw new Error(
        `No assessment structure template found for session ${session.academicYear}`,
      );
    }

    const assessmentStructures = (template.assessments as any[]).sort(
      (a: any, b: any) => a.order - b.order,
    );

    // Get school's grading model for grade calculation
    const gradingModel = await this.prisma.gradingModel.findUnique({
      where: { schoolId: student.user.schoolId },
    });

    const subjects = subjectEntries.map((entry) => {
      // Create a map of student assessments by name for quick lookup
      const studentAssessmentsMap = new Map();
      entry.assessments.forEach((assessment) => {
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
        id: entry.subject.id,
        name: entry.subject.name,
        code: entry.subject.name.substring(0, 3).toUpperCase(),
        totalScore: entry.totalScore,
        averageScore: entry.totalScore,
        grade: this.calculateGrade(entry.totalScore, gradingModel?.model),
        assessments: orderedAssessments,
      };
    });

    // Calculate overall statistics
    const totalSubjects = subjects.length;
    const totalScore = subjects.reduce((sum, subject) => sum + subject.totalScore, 0);
    const averageScore = totalSubjects > 0 ? totalScore / totalSubjects : 0;

    // Get class position (simplified - would need more complex logic in real implementation)
    const currentClassArmId = student.classArmStudents?.[0]?.classArmId;
    const classArmAssessments = await this.prisma.classArmStudentAssessment.findMany({
      where: {
        termId: term.id,
        deletedAt: null,
        classArmSubject: {
          classArmId: currentClassArmId,
        },
      },
      select: {
        studentId: true,
        score: true,
      },
    });

    // Aggregate total scores per student in the same class arm
    const studentScores = new Map<string, number>();
    for (const a of classArmAssessments) {
      studentScores.set(a.studentId, (studentScores.get(a.studentId) || 0) + a.score);
    }

    const sortedStudents = Array.from(studentScores.entries()).sort((a, b) => b[1] - a[1]);
    const position = sortedStudents.findIndex(([sid]) => sid === student.id) + 1;
    const classStudentsCount = sortedStudents.length;

    // Build school address string
    const addr = school?.primaryAddress;
    const schoolAddress = addr
      ? [addr.city, addr.state, addr.country].filter(Boolean).join(', ')
      : undefined;

    return {
      school: {
        name: school?.name || 'School',
        motto: school?.motto || undefined,
        logoUrl: school?.logoUrl || undefined,
        address: schoolAddress,
        resultTemplateId: school?.resultTemplateId || 'classic',
      },
      student: {
        id: student.id,
        studentNo: student.studentNo,
        fullName: `${student.user.firstName} ${student.user.lastName}`,
        classArm: {
          id: student.classArmStudents?.[0]?.classArm?.id || '',
          name: student.classArmStudents?.[0]?.classArm?.name || 'N/A',
          level: {
            id: student.classArmStudents?.[0]?.classArm?.level?.id || '',
            name: student.classArmStudents?.[0]?.classArm?.level?.name || 'N/A',
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
      assessmentStructures: assessmentStructures.map((s: any) => ({
        name: s.name,
        maxScore: s.maxScore,
        isExam: s.isExam,
        order: s.order,
      })),
      overallStats: {
        totalSubjects,
        totalScore,
        averageScore: Math.round(averageScore * 100) / 100,
        position,
        totalStudents: classStudentsCount,
        grade: this.calculateGrade(averageScore, gradingModel?.model),
      },
      gradingModel: (gradingModel?.model as Record<string, [number, number]>) || null,
    };
  }

  async getStudentProfile(userId: string): Promise<StudentProfileData> {
    const student = await this.prisma.student.findFirst({
      where: { userId },
      include: {
        user: {
          include: {
            address: true,
          },
        },
        classArmStudents: {
          where: { isActive: true },
          include: {
            classArm: {
              include: {
                level: true,
                academicSession: true,
              },
            },
          },
        },
        guardian: {
          include: {
            user: {
              include: {
                address: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Build address strings
    const buildAddress = (addr: any) => {
      if (!addr) return undefined;
      return [addr.street1, addr.street2, addr.city, addr.state, addr.country]
        .filter(Boolean)
        .join(', ');
    };

    // Get current academic session
    const activeClassArm = student.classArmStudents?.[0];
    const academicSession = activeClassArm?.classArm?.academicSession;

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
        address: buildAddress((student.user as any).address),
      },
      classArm: {
        id: activeClassArm?.classArm?.id || '',
        name: activeClassArm?.classArm?.name || 'N/A',
        level: {
          id: activeClassArm?.classArm?.level?.id || '',
          name: activeClassArm?.classArm?.level?.name || 'N/A',
        },
      },
      academicSession: academicSession
        ? {
            id: academicSession.id,
            academicYear: academicSession.academicYear,
            isCurrent: academicSession.isCurrent,
          }
        : undefined,
      guardian: student.guardian
        ? {
            id: student.guardian.id,
            firstName: student.guardian.user.firstName,
            lastName: student.guardian.user.lastName,
            email: student.guardian.user.email,
            phone: student.guardian.user.phone,
            relationship: 'Parent/Guardian',
            address: buildAddress((student.guardian.user as any).address),
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

    // Get academic sessions where student was enrolled (through classArm or assessments)
    // Include associated terms where student has assessments
    const sessions = await this.prisma.academicSession.findMany({
      where: {
        schoolId: student.user.schoolId,
        OR: [
          // Sessions where student was in a class arm
          {
            classArms: {
              some: {
                classArmStudents: {
                  some: {
                    studentId: student.id,
                  },
                },
              },
            },
          },
          // Sessions where student has assessments
          {
            terms: {
              some: {
                assessments: {
                  some: {
                    studentId: student.id,
                    deletedAt: null,
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
            assessments: {
              some: {
                studentId: student.id,
                deletedAt: null,
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

    // Get school's grading model
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });
    const gradingModel = user?.schoolId
      ? await this.prisma.gradingModel.findUnique({ where: { schoolId: user.schoolId } })
      : null;

    const studentAssessments = await this.prisma.classArmStudentAssessment.findMany({
      where: {
        studentId: student.id,
        termId: term.id,
        deletedAt: null,
      },
      include: {
        classArmSubject: {
          include: {
            subject: true,
            teachers: {
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
    });

    // Group assessments by subject
    const subjectMap = new Map<string, {
      subject: any;
      teachers: any[];
      assessments: typeof studentAssessments;
      totalScore: number;
      earliestDate: Date;
    }>();
    for (const a of studentAssessments) {
      const sid = a.classArmSubject.subject.id;
      const existing = subjectMap.get(sid);
      if (!existing) {
        subjectMap.set(sid, {
          subject: a.classArmSubject.subject,
          teachers: a.classArmSubject.teachers,
          assessments: [a],
          totalScore: a.score,
          earliestDate: a.createdAt,
        });
      } else {
        existing.assessments.push(a);
        existing.totalScore += a.score;
        if (a.createdAt < existing.earliestDate) {
          existing.earliestDate = a.createdAt;
        }
      }
    }

    return Array.from(subjectMap.values()).map((entry) => {
      const teacher = entry.teachers[0]?.teacher;
      const totalAssessments = entry.assessments.length;
      const completedAssessments = entry.assessments.filter((a) => a.score > 0).length;

      return {
        id: entry.subject.id,
        name: entry.subject.name,
        code: entry.subject.name.substring(0, 3).toUpperCase(),
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
        enrollmentDate: entry.earliestDate,
        currentScore: entry.totalScore,
        averageScore: entry.totalScore,
        grade: this.calculateGrade(entry.totalScore, gradingModel?.model),
        totalAssessments,
        completedAssessments,
      };
    });
  }

  private calculateGrade(score: number, gradingModelData?: any): string {
    if (gradingModelData && typeof gradingModelData === 'object') {
      for (const [grade, range] of Object.entries(gradingModelData)) {
        if (Array.isArray(range) && range.length === 2) {
          const [min, max] = range as [number, number];
          if (score >= min && score <= max) {
            return grade;
          }
        }
      }
    }

    // Fallback to default grading
    if (score >= 70) return 'A';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 45) return 'D';
    if (score >= 40) return 'E';
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

  async initiatePayment(userId: string, paymentId: string, amount?: number): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
    feeBreakdown: {
      feeAmount: number;
      platformFee: number;
      paystackFee: number;
      studentTotal: number;
      schoolReceives: number;
    };
    bankAccountMissing: boolean;
  }> {
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

    // Calculate payment amount (the school fee portion)
    const feeAmount = amount || (Number(payment.amount) - Number(payment.paidAmount));

    if (feeAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    // Fetch school's bank account + subaccount code
    const bankAccount = await this.prisma.schoolBankAccount.findUnique({
      where: { schoolId: student.user.schoolId },
    });

    const bankAccountMissing = !bankAccount?.paystackSubaccountCode;

    // Calculate fee breakdown
    const breakdown = this.feeCalculationService.calculateStudentTotal(feeAmount);

    // Generate reference
    const reference = this.paystackService.generateReference('STU_PAY');

    // Build Paystack request
    const paystackRequest: any = {
      amount: this.paystackService.convertToKobo(breakdown.studentTotal),
      email: student.user.email || `${student.studentNo}@school.com`,
      reference,
      metadata: {
        studentId: student.id,
        paymentId: payment.id,
        studentNo: student.studentNo,
        paymentStructureId: payment.paymentStructureId,
        feeAmount,
        platformFee: breakdown.platformFee,
        paystackFee: breakdown.paystackFee,
        studentTotal: breakdown.studentTotal,
      },
    };

    // If school has a subaccount, route payment to them
    if (!bankAccountMissing) {
      paystackRequest.subaccount = bankAccount.paystackSubaccountCode;
      paystackRequest.transaction_charge = this.paystackService.convertToKobo(breakdown.platformFee);
    }

    // Initialize payment with Paystack
    const paystackResponse = await this.paystackService.initializePayment(paystackRequest);

    // Store payment reference in database for verification
    await this.prisma.studentPayment.update({
      where: { id: paymentId },
      data: {
        notes: `Payment initiated with reference: ${reference}`,
      },
    });

    // Create PlatformTransaction record
    await this.prisma.platformTransaction.create({
      data: {
        schoolId: student.user.schoolId,
        studentPaymentId: payment.id,
        paymentReference: reference,
        totalCharged: breakdown.studentTotal,
        feeAmount: feeAmount,
        platformCommission: breakdown.platformFee,
        paystackFee: breakdown.paystackFee,
        status: 'PENDING',
      },
    });

    return {
      authorization_url: paystackResponse.data.authorization_url,
      access_code: paystackResponse.data.access_code,
      reference: paystackResponse.data.reference,
      feeBreakdown: {
        feeAmount,
        platformFee: breakdown.platformFee,
        paystackFee: breakdown.paystackFee,
        studentTotal: breakdown.studentTotal,
        schoolReceives: breakdown.schoolReceives,
      },
      bankAccountMissing,
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
