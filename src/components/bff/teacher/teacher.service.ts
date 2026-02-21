import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../prisma';
import { PasswordHasher } from '../../../utils/hasher';
import { PaystackService } from '../../../shared/services/paystack.service';
import { AssessmentStructureTemplateService } from '../../assessment-structures/assessment-structure-template.service';
import { ClassroomBroadsheetBuilder } from '../../../utils/classroom-broadsheet.util';
import { StorageService } from '../../storage/storage.service';
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
import { MarkClassAttendanceDto } from './dto/mark-class-attendance.dto';
import { MarkSubjectAttendanceDto } from './dto/mark-subject-attendance.dto';
import { ClassAttendanceResult, SubjectAttendanceResult } from './results/attendance-result';

@Injectable()
export class TeacherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasher,
    private readonly paystackService: PaystackService,
    private readonly templateService: AssessmentStructureTemplateService,
    private readonly classroomBroadsheetBuilder: ClassroomBroadsheetBuilder,
    private readonly storageService: StorageService,
  ) {}

  async getTeacherDashboardData(userId: string): Promise<TeacherDashboardData> {
    // Get teacher information with current session filtering
    const teacher = await this.getTeacherWithRelations(userId);

    const schoolId = teacher.user.schoolId;

    // Get current academic session and term
    const currentSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
    });

    if (!currentSession) {
      // Return empty data for new schools without academic sessions
      return {
        stats: {
          totalClasses: 0,
          totalStudents: 0,
          totalSubjects: 0,
          averageClassSize: 0,
          attendanceRate: 0,
          pendingAssessments: 0,
          completedAssessments: 0,
        },
        academicInfo: {
          currentSession: 'No active session',
          currentTerm: 'No active term',
          sessionStartDate: null,
          sessionEndDate: null,
          daysRemaining: 0,
        },
      };
    }

    const currentTerm = await this.prisma.term.findFirst({
      where: {
        academicSessionId: currentSession.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get all unique classes the teacher is assigned to
    const allClasses = [
      ...teacher.classArmSubjectTeachers.map((cast) => cast.classArmSubject.classArm),
      ...teacher.classArmTeachers.map((cat) => cat.classArm),
      ...teacher.classArmsAsTeacher,
    ];

    // Remove duplicates based on classArm id
    const uniqueClasses = allClasses.filter(
      (classArm, index, self) => index === self.findIndex((c) => c.id === classArm.id),
    );

    // Get all unique subjects the teacher teaches
    const uniqueSubjects = teacher.classArmSubjectTeachers
      .map((cast) => cast.classArmSubject.subject)
      .filter((subject, index, self) => index === self.findIndex((s) => s.id === subject.id));

    // Calculate core statistics only
    const totalStudents = uniqueClasses.reduce(
      (sum, classArm) => sum + classArm.classArmStudents.length,
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
        daysRemaining: Math.max(
          0,
          Math.ceil(
            (currentSession.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
          ),
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
      studentsCount: classArm.classArmStudents.length,
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
      id: cast.classArmSubject.classArm.id,
      name: cast.classArmSubject.classArm.name,
      level: cast.classArmSubject.classArm.level.name,
      subject: cast.classArmSubject.subject.name,
      studentsCount: cast.classArmSubject.classArm.classArmStudents.length,
      nextClassTime: this.getNextClassTime(cast.classArmSubject.classArm.id),
      location: (cast.classArmSubject.classArm as any).location || undefined,
      isClassTeacher: teacher.classArmsAsTeacher.some((cat) => cat.id === cast.classArmSubject.classArm.id),
    }));
  }

  // Get teacher's subjects
  async getTeacherSubjects(userId: string): Promise<TeacherSubjectInfo[]> {
    const teacher = await this.getTeacherWithRelations(userId);
    const currentSession = await this.getCurrentSession(teacher.user.schoolId);

    // Return empty array if no current session
    if (!currentSession) {
      return [];
    }

    const uniqueSubjects = teacher.classArmSubjectTeachers
      .map((cast) => cast.classArmSubject.subject)
      .filter((subject, index, self) => index === self.findIndex((s) => s.id === subject.id));

    return Promise.all(
      uniqueSubjects.map(async (subject) => ({
        id: subject.id,
        name: subject.name,
        department: (subject as any).department?.name || 'Unassigned',
        classesCount: teacher.classArmSubjectTeachers.filter(
          (cast) => cast.classArmSubject.subjectId === subject.id,
        ).length,
        totalStudents: teacher.classArmSubjectTeachers
          .filter((cast) => cast.classArmSubject.subjectId === subject.id)
          .reduce((sum, cast) => sum + cast.classArmSubject.classArm.classArmStudents.length, 0),
        averageScore: await this.getSubjectAverageScore(subject.id, currentSession.id),
      })),
    );
  }

  // Get recent activities
  async getRecentActivities(userId: string, limit: number = 10): Promise<RecentActivity[]> {
    const teacher = await this.getTeacherWithRelations(userId);

    if (!teacher) {
      return [];
    }

    // Get recent activities from the user_activities table
    const activities = await this.prisma.userActivity.findMany({
      where: {
        userId: userId,
        category: 'TEACHER',
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Transform activities to RecentActivity format
    return activities.map((activity) => {
      let title = '';
      let description = '';
      let type: 'attendance' | 'assessment' | 'class' | 'announcement' = 'class';

      switch (activity.action) {
        case 'MARK_CLASS_ATTENDANCE':
          title = 'Class Attendance Marked';
          description = activity.description || `Marked attendance for class`;
          type = 'attendance';
          break;
        case 'MARK_SUBJECT_ATTENDANCE':
          title = 'Subject Attendance Marked';
          description = activity.description || `Marked attendance for subject`;
          type = 'attendance';
          break;
        case 'CREATE_ASSESSMENT':
          title = 'Assessment Created';
          description = `Created new assessment`;
          type = 'assessment';
          break;
        case 'GRADE_ASSESSMENT':
          title = 'Assessment Graded';
          description = `Graded student assessment`;
          type = 'assessment';
          break;
        case 'VIEW_TEACHER_ACTIVITIES':
          title = 'Viewed Activities';
          description = `Checked recent activities`;
          type = 'class';
          break;
        default:
          title = activity.description || 'Activity';
          description = `Teacher activity: ${activity.action}`;
          type = 'class';
      }

      return {
        id: activity.id,
        type,
        title,
        description,
        timestamp: activity.timestamp.toISOString(),
        classId: activity.entityId,
        subjectId: activity.entityId,
      };
    });
  }

  // Get upcoming events
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getUpcomingEvents(userId: string, _days: number = 7): Promise<UpcomingEvent[]> {
    // Note: days parameter is reserved for future date range filtering
    await this.getTeacherWithRelations(userId);

    // For new teachers with no data, return empty array
    return [];
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
        department: true,
        classArmSubjectTeachers: {
          where: {
            deletedAt: null,
            classArmSubject: {
              classArm: {
                academicSession: {
                  isCurrent: true,
                },
                deletedAt: null,
              },
            },
          },
          include: {
            classArmSubject: {
              include: {
                subject: true,
                classArm: {
                  include: {
                    level: true,
                    classArmStudents: {
                      where: { isActive: true },
                    },
                  },
                },
              },
            },
          },
        },
        classArmTeachers: {
          where: {
            deletedAt: null,
            classArm: {
              academicSession: {
                isCurrent: true,
              },
              deletedAt: null,
            },
          },
          include: {
            classArm: {
              include: {
                level: true,
                classArmStudents: {
                  where: { isActive: true },
                },
              },
            },
          },
        },
        classArmsAsTeacher: {
          where: {
            academicSession: {
              isCurrent: true,
            },
            deletedAt: null,
          },
          include: {
            level: true,
            classArmStudents: {
              where: { isActive: true },
            },
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

    // Extract unique subject names from class arm subject assignments
    const subjects = [
      ...new Set(
        teacher.classArmSubjectTeachers.map((cast) => cast.classArmSubject.subject.name),
      ),
    ];

    // Extract unique class names from class arm assignments and primary class arms
    const classArmNames = new Set<string>();
    for (const cat of teacher.classArmTeachers) {
      classArmNames.add(
        `${cat.classArm.level.name} ${cat.classArm.name}`,
      );
    }
    for (const ca of teacher.classArmsAsTeacher) {
      classArmNames.add(`${ca.level.name} ${ca.name}`);
    }
    const classesAssigned = [...classArmNames];

    return {
      teacherNo: teacher.teacherNo,
      firstName: teacher.user.firstName,
      lastName: teacher.user.lastName,
      email: teacher.user.email,
      phone: teacher.user.phone,
      department: teacher.department?.name || 'Unassigned',
      status: teacher.status,
      employmentType: teacher.employmentType,
      qualification: teacher.qualification,
      joinDate: teacher.joinDate.toISOString(),
      avatar: teacher.user.avatarUrl,
      subjects,
      classesAssigned,
    };
  }

  // Update teacher profile information
  async updateTeacherProfile(userId: string, updateData: any): Promise<TeacherProfile> {
    const teacher = await this.getTeacherWithRelations(userId);

    // Delete old avatar from S3 if a new one is being set
    if (updateData.avatarUrl && teacher.user.avatarUrl) {
      const oldKey = this.storageService.extractKeyFromUrl(teacher.user.avatarUrl);
      if (oldKey) {
        this.storageService.deleteObject(oldKey);
      }
    }

    // Prepare user update data
    const userUpdateData: any = {};
    if (updateData.firstName) userUpdateData.firstName = updateData.firstName;
    if (updateData.lastName) userUpdateData.lastName = updateData.lastName;
    if (updateData.email) userUpdateData.email = updateData.email;
    if (updateData.phone) userUpdateData.phone = updateData.phone;
    if (updateData.avatarUrl) userUpdateData.avatarUrl = updateData.avatarUrl;
    if (updateData.dateOfBirth) userUpdateData.dateOfBirth = new Date(updateData.dateOfBirth);
    if (updateData.gender) userUpdateData.gender = updateData.gender;
    if (updateData.stateOfOrigin) userUpdateData.stateOfOrigin = updateData.stateOfOrigin;

    // Update user if there are changes
    if (Object.keys(userUpdateData).length > 0) {
      await this.prisma.user.update({
        where: { id: teacher.userId },
        data: userUpdateData,
      });
    }

    // Re-fetch and return updated profile
    return this.getTeacherProfile(userId);
  }

  // Change teacher password
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const teacher = await this.getTeacherWithRelations(userId);

    // Verify old password
    const isOldPasswordValid = await this.passwordHasher.compare(
      oldPassword,
      teacher.user.password,
    );
    if (!isOldPasswordValid) {
      throw new ForbiddenException('Invalid current password');
    }

    // Hash new password
    const hashedNewPassword = await this.passwordHasher.hash(newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: teacher.userId },
      data: { password: hashedNewPassword },
    });
  }

  // Get user preferences
  async getUserPreferences(userId: string) {
    let preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await this.prisma.userPreferences.create({
        data: {
          userId,
          themeMode: 'SYSTEM',
          colorSchemeType: 'SCHOOL',
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
          inAppNotifications: true,
          marketingEmails: false,
        },
      });
    }

    return preferences;
  }

  // Update user preferences
  async updateUserPreferences(userId: string, updateData: any) {
    // Check if user has paid for custom color scheme if trying to use custom colors
    if (updateData.colorSchemeType === 'CUSTOM') {
      const hasValidPayment = await this.prisma.colorSchemePayment.findFirst({
        where: {
          userId,
          status: 'PAID',
          expiresAt: { gt: new Date() },
        },
      });

      if (!hasValidPayment) {
        throw new ConflictException(
          'Custom color scheme requires payment. Please initiate payment first.',
        );
      }
    }

    const preferences = await this.prisma.userPreferences.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
      },
    });

    return preferences;
  }

  // Initiate color scheme payment
  async initiateColorSchemePayment(userId: string, colorData: any) {
    // Get user information
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has a valid paid payment
    const validPaidPayment = await this.prisma.colorSchemePayment.findFirst({
      where: {
        userId,
        status: 'PAID',
        expiresAt: { gt: new Date() },
      },
    });

    if (validPaidPayment) {
      throw new ConflictException('You already have an active custom color scheme subscription');
    }

    // Check for existing pending payment
    const existingPendingPayment = await this.prisma.colorSchemePayment.findFirst({
      where: {
        userId,
        status: 'PENDING',
      },
    });

    // If there's a pending payment, check if it's still valid (30 minutes)
    if (existingPendingPayment) {
      const paymentAge = Date.now() - existingPendingPayment.createdAt.getTime();
      const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds

      if (paymentAge < 0) {
        // Payment is still valid, return the existing authorization URL
        return {
          paymentId: existingPendingPayment.id,
          paymentReference: existingPendingPayment.paymentReference,
          amount: Number(existingPendingPayment.amount),
          currency: existingPendingPayment.currency,
          expiresAt: existingPendingPayment.expiresAt,
          authorizationUrl: existingPendingPayment.authorizationUrl,
        };
      } else {
        // Payment has expired, mark it as expired and create a new one
        await this.prisma.colorSchemePayment.update({
          where: { id: existingPendingPayment.id },
          data: { status: 'EXPIRED' },
        });
      }
    }

    // Generate payment reference
    const paymentReference = this.paystackService.generateReference('CS_PAY');

    // Initialize payment with Paystack
    try {
      const paystackResponse = await this.paystackService.initializePayment({
        amount: this.paystackService.convertToKobo(500), // 500 NGN in kobo
        email: user.email,
        reference: paymentReference,
        metadata: {
          userId,
          paymentType: 'COLOR_SCHEME',
          customPrimaryColor: colorData.customPrimaryColor,
          customSecondaryColor: colorData.customSecondaryColor,
          customAccentColor: colorData.customAccentColor,
        },
      });

      // Paystack response received

      if (!paystackResponse.data || !paystackResponse.data.authorization_url) {
        throw new Error('Failed to get authorization URL from Paystack');
      }

      // Create payment record
      const payment = await this.prisma.colorSchemePayment.create({
        data: {
          userId,
          amount: 500, // 500 NGN
          currency: 'NGN',
          status: 'PENDING',
          paymentReference,
          authorizationUrl: paystackResponse.data.authorization_url,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      return {
        paymentId: payment.id,
        paymentReference,
        amount: 500,
        currency: 'NGN',
        expiresAt: payment.expiresAt,
        authorizationUrl: paystackResponse.data.authorization_url,
      };
    } catch (error) {
      throw new Error(`Failed to initialize payment: ${error.message}`);
    }
  }

  // Get color scheme payment status
  async getColorSchemePaymentStatus(userId: string) {
    const payment = await this.prisma.colorSchemePayment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      return {
        hasPayment: false,
        status: null,
        canUseCustomColors: false,
      };
    }

    const canUseCustomColors =
      payment.status === 'PAID' && payment.expiresAt && payment.expiresAt > new Date();

    return {
      hasPayment: true,
      status: payment.status,
      canUseCustomColors,
      expiresAt: payment.expiresAt,
      paymentReference: payment.paymentReference,
    };
  }

  // Verify color scheme payment
  async verifyColorSchemePayment(userId: string, reference: string) {
    try {
      // Verify payment with Paystack
      const paystackResponse = await this.paystackService.verifyPayment(reference);

      if (paystackResponse.data.status !== 'success') {
        return {
          success: false,
          message: 'Payment verification failed',
        };
      }

      // Find the payment record
      const payment = await this.prisma.colorSchemePayment.findFirst({
        where: {
          userId,
          paymentReference: reference,
          status: 'PENDING',
        },
      });

      if (!payment) {
        return {
          success: false,
          message: 'Payment record not found',
        };
      }

      // Update payment status to PAID
      await this.prisma.colorSchemePayment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Payment verified successfully',
        paymentId: payment.id,
        status: 'PAID',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Payment verification failed',
      };
    }
  }

  // Helper method to get current session
  private async getCurrentSession(schoolId: string) {
    const currentSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true },
    });

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

  private async getAttendanceRate(teacherId: string, sessionId: string, termId?: string) {
    // Get class arms where this teacher is the class teacher
    const classArmIds = await this.prisma.classArm.findMany({
      where: {
        classTeacherId: teacherId,
        academicSessionId: sessionId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (classArmIds.length === 0) return 0;

    const ids = classArmIds.map((ca) => ca.id);

    // Get today's date boundaries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Count today's class attendance records for the teacher's classes
    const [presentCount, totalRecords] = await Promise.all([
      this.prisma.studentAttendance.count({
        where: {
          classArmStudent: { classArmId: { in: ids } },
          date: { gte: today, lt: tomorrow },
          status: 'PRESENT',
          deletedAt: null,
          ...(termId && { termId }),
        },
      }),
      this.prisma.studentAttendance.count({
        where: {
          classArmStudent: { classArmId: { in: ids } },
          date: { gte: today, lt: tomorrow },
          deletedAt: null,
          ...(termId && { termId }),
        },
      }),
    ]);

    if (totalRecords === 0) return 0;

    return Math.round((presentCount / totalRecords) * 100);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getAssessmentCounts(_teacherId: string, _sessionId: string) {
    // For new teachers with no data, return 0
    return {
      pending: 0,
      completed: 0,
    };
  }

  // Get class arm ID for subject teachers (no authorization required)
  async getClassArmId(
    userId: string,
    level: string,
    classArm: string,
  ): Promise<{ classArmId: string; classArmName: string; levelName: string }> {
    const teacher = await this.getTeacherWithRelations(userId);

    // Find the class arm by level and classArm name
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
      },
    });

    if (!classArmData) {
      throw new NotFoundException('Class arm not found');
    }

    return {
      classArmId: classArmData.id,
      classArmName: classArmData.name,
      levelName: classArmData.level.name,
    };
  }

  // Get class details for class teachers
  async getClassDetails(userId: string, classArmId: string): Promise<ClassDetails> {
    const teacher = await this.getTeacherWithRelations(userId);

    // Find the specific class arm
    const classArmData = await this.prisma.classArm.findFirst({
      where: {
        id: classArmId,
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
        classArmStudents: {
          where: { isActive: true },
          include: {
            student: {
              include: {
                user: true,
                assessments: {
                  where: {
                    deletedAt: null,
                    classArmSubject: { classArmId: classArmId },
                  },
                  include: {
                    classArmSubject: {
                      include: { subject: true },
                    },
                  },
                },
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
    const students = classArmData.classArmStudents.map((cas) => cas.student);
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

    // Calculate today's attendance rate
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999,
    );

    const allAttendances = classArmData.classArmStudents.flatMap((cas) => cas.studentAttendances);
    const todayAttendanceRecords = allAttendances.filter((attendance) => {
      const attendanceDate = new Date(attendance.date);
      return attendanceDate >= startOfToday && attendanceDate <= endOfToday;
    });

    const presentToday = todayAttendanceRecords.filter(
      (attendance) => attendance.status === 'PRESENT',
    ).length;

    const attendanceRate =
      students.length > 0 ? Math.round((presentToday / students.length) * 100) : 0;

    // Get recent activities (empty for new teachers)
    const recentActivities: any[] = [];

    // Calculate top performers from assessment data
    const performanceMap = new Map<
      string,
      { totalScore: number; totalMaxScore: number; student: any }
    >();

    classArmData.classArmStudents.forEach((cas) => {
      const student = cas.student;
      const assessments = (student as any).assessments || [];
      if (assessments.length > 0) {
        const totalScore = assessments.reduce((sum: number, a: any) => sum + a.score, 0);
        const totalMaxScore = assessments.reduce((sum: number, a: any) => sum + (a.maxScore || 0), 0);
        performanceMap.set(student.id, { totalScore, totalMaxScore, student });
      }
    });

    const topPerformers = Array.from(performanceMap.entries())
      .map(([studentId, data]) => ({
        id: studentId,
        name: `${data.student.user.firstName} ${data.student.user.lastName}`,
        score: data.totalMaxScore > 0 ? Math.round((data.totalScore / data.totalMaxScore) * 100) : 0,
        avatarUrl: data.student.user.avatarUrl || null,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Calculate real average score from all students with assessments
    const allScores = Array.from(performanceMap.values())
      .map((data) => data.totalMaxScore > 0 ? (data.totalScore / data.totalMaxScore) * 100 : 0);
    const averageScore = allScores.length > 0
      ? Math.round((allScores.reduce((sum, s) => sum + s, 0) / allScores.length) * 100) / 100
      : 0;

    return {
      id: classArmData.id,
      name: classArmData.name,
      level: classArmData.level.name,
      department: classArmData.department?.name,
      classTeacher: {
        id: classArmData.classTeacher.id,
        name: `${classArmData.classTeacher.user.firstName} ${classArmData.classTeacher.user.lastName}`,
        email: classArmData.classTeacher.user.email || '',
        avatarUrl: classArmData.classTeacher.user.avatarUrl || null,
      },
      captain: classArmData.captain
        ? {
            id: classArmData.captain.id,
            name: `${classArmData.captain.user.firstName} ${classArmData.captain.user.lastName}`,
            studentNo: classArmData.captain.studentNo,
            avatarUrl: classArmData.captain.user.avatarUrl || null,
          }
        : undefined,
      stats: {
        totalStudents: students.length,
        maleStudents,
        femaleStudents,
        averageAge,
        attendanceRate,
        averageScore,
      },
      topPerformers,
      recentActivities,
    };
  }

  // Get students in a specific class for class teachers
  async getClassStudents(userId: string, classArmId: string): Promise<ClassStudentInfo[]> {
    const teacher = await this.getTeacherWithRelations(userId);

    // Find the specific class arm
    const classArmData = await this.prisma.classArm.findFirst({
      where: {
        id: classArmId,
        schoolId: teacher.user.schoolId,
        deletedAt: null,
      },
      include: {
        classArmStudents: {
          where: { isActive: true },
          include: {
            student: {
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
        },
        classArmSubjects: {
          include: {
            subject: true,
            teachers: {
              where: { deletedAt: null },
              include: {
                teacher: {
                  include: { user: true },
                },
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
    const teachesAnySubject = (classArmData as any).classArmSubjects.some(
      (cas: any) => cas.teachers.some((t: any) => t.teacherId === teacher.id),
    );

    if (!isClassTeacher && !teachesAnySubject) {
      const availableAssignments = (classArmData as any).classArmSubjects
        .flatMap((cas: any) => cas.teachers.map((t: any) => `teacherId=${t.teacherId}, subjectName=${cas.subject.name}`))
        .join('; ');

      throw new ForbiddenException(
        `You are not authorized to access this class's student information. ` +
          `You must be either the class teacher or assigned to teach any subject in this class. ` +
          `Looking for: teacherId=${teacher.id} in classArmId=${classArmId}. ` +
          `Class teacher: ${classArmData.classTeacherId || 'None assigned'}. ` +
          `Available subject assignments: ${availableAssignments}`,
      );
    }

    return classArmData.classArmStudents.map((classArmStudent) => {
      const student = classArmStudent.student;
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
          : (student.guardianFirstName || student.guardianLastName)
            ? `${student.guardianFirstName || ''} ${student.guardianLastName || ''}`.trim()
            : undefined,
        guardianPhone: student.guardian?.user.phone || student.guardianPhone || undefined,
        guardianEmail: student.guardian?.user.email || student.guardianEmail || undefined,
        admissionDate: student.admissionDate.toISOString(),
        status: student.status,
        avatarUrl: student.user.avatarUrl || undefined,
      };
    });
  }

  // Get subject assessment scores for a specific class
  async getSubjectAssessmentScores(
    userId: string,
    classArmId: string,
    subjectName: string,
    termId?: string,
  ): Promise<SubjectAssessmentScores> {
    const teacher = await this.getTeacherWithRelations(userId);
    const schoolId = teacher.user.schoolId;

    // Find subject by name
    const subject = await this.prisma.subject.findFirst({
      where: { name: { equals: subjectName, mode: 'insensitive' }, schoolId },
    });
    if (!subject) {
      throw new NotFoundException(`Subject "${subjectName}" not found`);
    }

    // Find ClassArmSubject with teachers
    const classArmSubject = await this.prisma.classArmSubject.findFirst({
      where: { classArmId, subjectId: subject.id, deletedAt: null },
      include: {
        classArm: { include: { level: true } },
        subject: true,
        teachers: {
          where: { deletedAt: null },
          include: { teacher: { include: { user: true } } },
        },
      },
    });

    if (!classArmSubject) {
      throw new NotFoundException(`Subject "${subjectName}" is not assigned to this class`);
    }

    // Verify authorization
    const isClassTeacher = classArmSubject.classArm.classTeacherId === teacher.id;
    const subjectTeacherRecord = classArmSubject.teachers.find((t) => t.teacherId === teacher.id);

    if (!isClassTeacher && !subjectTeacherRecord) {
      throw new ForbiddenException(
        `You are not authorized to access this subject's assessment scores.`,
      );
    }

    // Get current session/term
    const currentSession = await this.prisma.academicSession.findFirst({
      where: { isCurrent: true, schoolId },
      include: { terms: { where: { deletedAt: null }, orderBy: { startDate: 'asc' } } },
    });

    // Resolve selected term: use termId if provided, otherwise fall back to current term
    let selectedTerm: { id: string; name: string; isLocked: boolean; isCurrent: boolean } | undefined;
    if (termId) {
      const termRecord = await this.prisma.term.findFirst({
        where: { id: termId, academicSession: { schoolId }, deletedAt: null },
      });
      if (!termRecord) {
        throw new NotFoundException(`Term with ID "${termId}" not found`);
      }
      selectedTerm = { id: termRecord.id, name: termRecord.name, isLocked: termRecord.isLocked, isCurrent: termRecord.isCurrent };
    } else {
      // Try to find the term marked as current; fall back to first term in the session
      const currentTermRecord = currentSession?.terms?.find((t) => t.isCurrent) || currentSession?.terms?.[0];
      if (currentTermRecord) {
        selectedTerm = { id: currentTermRecord.id, name: currentTermRecord.name, isLocked: currentTermRecord.isLocked, isCurrent: currentTermRecord.isCurrent };
      }
    }

    // Build availableTerms from all terms in the current session
    const availableTerms = (currentSession?.terms || []).map((t) => ({
      id: t.id,
      name: t.name,
      isCurrent: t.isCurrent,
      isLocked: t.isLocked,
    }));

    // Get grading model
    const gradingModel = await this.prisma.gradingModel.findUnique({
      where: { schoolId },
    });

    // Get students in the class
    const classArmStudents = await this.prisma.classArmStudent.findMany({
      where: { classArmId, isActive: true },
      include: { student: { include: { user: true } } },
    });

    // Get all assessments for this classArmSubject (selected term only)
    const allAssessments = selectedTerm
      ? await this.prisma.classArmStudentAssessment.findMany({
          where: {
            classArmSubjectId: classArmSubject.id,
            deletedAt: null,
            termId: selectedTerm.id,
          },
        })
      : [];

    // Group assessments by student
    const assessmentsByStudent = new Map<string, typeof allAssessments>();
    for (const assessment of allAssessments) {
      const existing = assessmentsByStudent.get(assessment.studentId) || [];
      existing.push(assessment);
      assessmentsByStudent.set(assessment.studentId, existing);
    }

    // Process each student
    const studentsWithScores = await Promise.all(
      classArmStudents.map(async (cas) => {
        const student = cas.student;
        const studentAssessments = assessmentsByStudent.get(student.id) || [];

        const assessments = await Promise.all(
          studentAssessments.map(async (assessment) => {
            const maxScore =
              assessment.maxScore ||
              (await this.getMaxScoreForAssessmentType(assessment.name, schoolId, currentSession?.id));
            const percentage = maxScore > 0 ? Math.round((assessment.score / maxScore) * 100) : 0;
            return {
              id: assessment.id,
              name: assessment.name,
              score: assessment.score,
              maxScore,
              percentage,
              isExam: assessment.isExam,
              date: assessment.createdAt.toISOString(),
            };
          }),
        );

        const totalScore = assessments.reduce((sum, a) => sum + a.score, 0);
        const totalMaxScore = assessments.reduce((sum, a) => sum + a.maxScore, 0);
        const totalPercentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

        return {
          id: student.id,
          studentNo: student.studentNo,
          fullName: `${student.user.firstName} ${student.user.lastName}`,
          gender: student.user.gender,
          avatarUrl: student.user.avatarUrl || null,
          assessments,
          totalScore,
          averageScore: totalPercentage,
          grade: this.calculateGradeFromModel(totalPercentage, gradingModel?.model),
        };
      }),
    );

    // Calculate class statistics
    const validStudents = studentsWithScores.filter((s) => s.assessments.length > 0);
    const scores = validStudents.map((s) => s.averageScore);
    const classStats = {
      totalStudents: validStudents.length,
      averageScore: scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      passRate: scores.length > 0 ? Math.round((scores.filter((s) => s >= 50).length / scores.length) * 100) : 0,
    };

    const teacherInfo = subjectTeacherRecord?.teacher || classArmSubject.teachers[0]?.teacher;

    return {
      subjectId: subject.id,
      subjectName: subject.name,
      classArmId: classArmSubject.classArm.id,
      classArmName: classArmSubject.classArm.name,
      levelName: classArmSubject.classArm.level?.name || '',
      teacher: teacherInfo ? {
        id: teacherInfo.id,
        name: `${teacherInfo.user.firstName} ${teacherInfo.user.lastName}`,
      } : { id: teacher.id, name: '' },
      academicSession: {
        id: currentSession?.id,
        name: currentSession?.academicYear,
        isCurrent: currentSession?.isCurrent,
      },
      currentTerm: selectedTerm
        ? {
            id: selectedTerm.id,
            name: selectedTerm.name,
            isLocked: selectedTerm.isLocked,
          }
        : null,
      availableTerms,
      classStats,
      students: studentsWithScores,
      gradingModel: (gradingModel?.model as Record<string, [number, number]>) || null,
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
    academicSessionId?: string,
  ): Promise<number> {
    // Try to look up from the active template
    if (academicSessionId) {
      try {
        const template = await this.templateService.findActiveTemplateForSchoolSession(
          schoolId,
          academicSessionId,
        );
        const entry = this.templateService.getAssessmentEntryByName(template, assessmentName);
        if (entry) {
          return entry.maxScore;
        }
      } catch {
        // Fall through to default
      }
    }

    // Fallback default
    return 100;
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
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId },
      include: { user: true },
    });
    if (!teacher) throw new Error('Teacher not found');
    const schoolId = teacher.user.schoolId;

    // Find the student and their active class arm
    const student = await this.prisma.student.findFirst({
      where: { id: createDto.studentId, user: { schoolId } },
      include: {
        user: true,
        classArmStudents: { where: { isActive: true } },
      },
    });
    if (!student) throw new Error('Student not found or not in your school');

    const classArmId = student.classArmStudents?.[0]?.classArmId;
    if (!classArmId) throw new Error('Student is not enrolled in any class');

    // Find the subject
    const subject = await this.prisma.subject.findFirst({
      where: { name: { equals: createDto.subjectName, mode: 'insensitive' }, schoolId },
    });
    if (!subject) throw new Error(`Subject "${createDto.subjectName}" not found`);

    // Resolve ClassArmSubject
    const classArmSubject = await this.prisma.classArmSubject.findUnique({
      where: { classArmId_subjectId: { classArmId, subjectId: subject.id } },
    });
    if (!classArmSubject) throw new Error('This subject is not assigned to the student\'s class');

    // Verify teacher authorization
    const authorized = await this.prisma.classArmSubjectTeacher.findFirst({
      where: { classArmSubjectId: classArmSubject.id, teacherId: teacher.id, deletedAt: null },
    });
    if (!authorized) throw new Error('You are not authorized to teach this subject in this class');

    // Resolve term
    let term: { id: string; academicSessionId: string; isLocked: boolean };
    if (createDto.termId) {
      const termRecord = await this.prisma.term.findFirst({
        where: { id: createDto.termId, academicSession: { schoolId } },
      });
      if (!termRecord) throw new Error(`Term with ID "${createDto.termId}" not found`);
      term = { id: termRecord.id, academicSessionId: termRecord.academicSessionId, isLocked: termRecord.isLocked };
    } else {
      const currentSession = await this.prisma.academicSession.findFirst({
        where: { isCurrent: true, schoolId },
        include: { terms: { where: { name: { equals: createDto.termName, mode: 'insensitive' }, deletedAt: null } } },
      });
      if (!currentSession) throw new Error('No current academic session found');
      const termRecord = currentSession.terms[0];
      if (!termRecord) throw new Error(`Term "${createDto.termName}" not found in current academic session`);
      term = { id: termRecord.id, academicSessionId: termRecord.academicSessionId, isLocked: termRecord.isLocked };
    }

    // Check term lock
    if (term.isLocked) {
      throw new ForbiddenException('Assessment scores for this term are locked and cannot be modified.');
    }

    // Look up assessment type from template
    let assessmentEntry: { id: string; maxScore: number; isExam: boolean } | undefined;
    try {
      const template = await this.templateService.findActiveTemplateForSchoolSession(schoolId, term.academicSessionId);
      const entry = this.templateService.getAssessmentEntryByName(template, createDto.assessmentName);
      if (entry) assessmentEntry = { id: entry.id, maxScore: entry.maxScore, isExam: entry.isExam };
    } catch { /* proceed without template */ }

    const isExam = createDto.isExam !== undefined ? createDto.isExam : assessmentEntry?.isExam || false;

    // Create assessment score directly
    const assessmentScore = await this.prisma.classArmStudentAssessment.create({
      data: {
        classArmSubjectId: classArmSubject.id,
        studentId: student.id,
        termId: term.id,
        name: createDto.assessmentName,
        score: createDto.score,
        isExam,
        assessmentTypeId: assessmentEntry?.id,
        maxScore: assessmentEntry?.maxScore,
      },
    });

    // Resolve term name for response
    const termRecord = await this.prisma.term.findUnique({ where: { id: term.id } });

    return {
      id: assessmentScore.id,
      name: assessmentScore.name,
      score: assessmentScore.score,
      isExam: assessmentScore.isExam,
      studentId: student.id,
      studentName: `${student.user.firstName} ${student.user.lastName}`,
      subjectName: subject.name,
      termName: termRecord?.name || '',
      createdAt: assessmentScore.createdAt,
    };
  }

  async updateStudentAssessmentScore(
    userId: string,
    assessmentId: string,
    updateDto: any,
  ): Promise<any> {
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId },
      include: { user: true },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    // Find the assessment with its relations
    const existing = await this.prisma.classArmStudentAssessment.findFirst({
      where: { id: assessmentId, deletedAt: null },
      include: {
        student: { include: { user: true } },
        classArmSubject: { include: { subject: true } },
        term: true,
      },
    });
    if (!existing) throw new NotFoundException('Assessment score not found');
    if (existing.student.user.schoolId !== teacher.user.schoolId) {
      throw new ForbiddenException('Assessment score not found in your school');
    }

    // Verify teacher authorization
    const authorized = await this.prisma.classArmSubjectTeacher.findFirst({
      where: { classArmSubjectId: existing.classArmSubjectId, teacherId: teacher.id, deletedAt: null },
    });
    if (!authorized) throw new ForbiddenException('You are not authorized to modify this assessment score');

    // Check term lock
    if (existing.term.isLocked) {
      throw new ForbiddenException('Assessment scores for this term are locked and cannot be modified.');
    }

    // Update directly — no totalScore recalculation needed
    const updated = await this.prisma.classArmStudentAssessment.update({
      where: { id: assessmentId },
      data: {
        ...(updateDto.score !== undefined && { score: updateDto.score }),
        ...(updateDto.assessmentName && { name: updateDto.assessmentName }),
        ...(updateDto.isExam !== undefined && { isExam: updateDto.isExam }),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      score: updated.score,
      isExam: updated.isExam,
      studentId: existing.student.id,
      studentName: `${existing.student.user.firstName} ${existing.student.user.lastName}`,
      subjectName: existing.classArmSubject.subject.name,
      termName: existing.term.name,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteStudentAssessmentScore(userId: string, assessmentId: string): Promise<any> {
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId },
      include: { user: true },
    });
    if (!teacher) throw new Error('Teacher not found');

    const existing = await this.prisma.classArmStudentAssessment.findFirst({
      where: { id: assessmentId, deletedAt: null },
      include: {
        student: { include: { user: true } },
        classArmSubject: { include: { subject: true } },
        term: true,
      },
    });
    if (!existing) throw new Error('Assessment score not found');
    if (existing.student.user.schoolId !== teacher.user.schoolId) {
      throw new Error('Assessment score not found in your school');
    }

    // Verify teacher authorization
    const authorized = await this.prisma.classArmSubjectTeacher.findFirst({
      where: { classArmSubjectId: existing.classArmSubjectId, teacherId: teacher.id, deletedAt: null },
    });
    if (!authorized) throw new Error('You are not authorized to delete this assessment score');

    // Check term lock
    if (existing.term.isLocked) {
      throw new ForbiddenException('Assessment scores for this term are locked and cannot be modified.');
    }

    // Soft delete — no totalScore recalculation needed
    await this.prisma.classArmStudentAssessment.update({
      where: { id: assessmentId },
      data: { deletedAt: new Date() },
    });

    return {
      message: 'Assessment score deleted successfully',
      deletedAssessment: {
        id: existing.id,
        name: existing.name,
        score: existing.score,
        studentName: `${existing.student.user.firstName} ${existing.student.user.lastName}`,
        subjectName: existing.classArmSubject.subject.name,
        termName: existing.term.name,
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
    const { assessmentScores, subjectName, termName, termId, assessmentName } = upsertDto;
    const result: BulkStudentAssessmentScoreResult = { success: [], failed: [] };

    // ── 1. Resolve teacher ──
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId },
      include: { user: true },
    });
    if (!teacher) throw new Error('Teacher not found');
    const schoolId = teacher.user.schoolId;

    // ── 2. Resolve subject ──
    if (!subjectName) throw new Error('subjectName is required');
    const subject = await this.prisma.subject.findFirst({
      where: { name: { equals: subjectName, mode: 'insensitive' }, schoolId },
    });
    if (!subject) throw new Error(`Subject "${subjectName}" not found`);

    // ── 3. Resolve term ──
    if (!termId && !termName) throw new Error('Either termId or termName is required');
    let term: { id: string; name: string; academicSessionId: string; isLocked: boolean };
    if (termId) {
      const termRecord = await this.prisma.term.findFirst({
        where: { id: termId, academicSession: { schoolId } },
      });
      if (!termRecord) throw new Error(`Term with ID "${termId}" not found`);
      term = { id: termRecord.id, name: termRecord.name, academicSessionId: termRecord.academicSessionId, isLocked: termRecord.isLocked };
    } else {
      const currentSession = await this.prisma.academicSession.findFirst({
        where: { isCurrent: true, schoolId },
        include: { terms: { where: { name: { equals: termName, mode: 'insensitive' }, deletedAt: null } } },
      });
      if (!currentSession) throw new Error('No current academic session found');
      const termRecord = currentSession.terms[0];
      if (!termRecord) throw new Error(`Term "${termName}" not found in current academic session`);
      term = { id: termRecord.id, name: termRecord.name, academicSessionId: termRecord.academicSessionId, isLocked: termRecord.isLocked };
    }

    // ── 3a. Check term lock ──
    if (term.isLocked) {
      throw new ForbiddenException('Assessment scores for this term are locked and cannot be modified.');
    }

    // ── 4. Resolve assessment template ──
    let template: any = null;
    try {
      template = await this.templateService.findActiveTemplateForSchoolSession(schoolId, term.academicSessionId);
    } catch { /* proceed without */ }

    // ── 5. Separate updates-by-id vs upserts-by-student ──
    const updateByIdItems: typeof assessmentScores = [];
    const upsertItems: typeof assessmentScores = [];

    for (const item of assessmentScores) {
      if (item.id) {
        updateByIdItems.push(item);
      } else {
        if (!item.studentId) {
          result.failed.push({ assessmentScore: item, error: 'studentId is required for new assessment scores' });
          continue;
        }
        if (!(item.assessmentName || assessmentName)) {
          result.failed.push({ assessmentScore: item, error: 'assessmentName is required (provide at top level or per item)' });
          continue;
        }
        upsertItems.push(item);
      }
    }

    // ── 6. Process updates-by-id ──
    if (updateByIdItems.length > 0) {
      const existingAssessments = await this.prisma.classArmStudentAssessment.findMany({
        where: { id: { in: updateByIdItems.map(i => i.id!) }, deletedAt: null },
        include: {
          student: { include: { user: true } },
          classArmSubject: true,
        },
      });
      const assessmentMap = new Map(existingAssessments.map(a => [a.id, a]));

      for (const item of updateByIdItems) {
        try {
          const existing = assessmentMap.get(item.id!);
          if (!existing) { result.failed.push({ assessmentScore: item, error: 'Assessment score not found' }); continue; }
          if (existing.student.user.schoolId !== schoolId) { result.failed.push({ assessmentScore: item, error: 'Assessment score not found in your school' }); continue; }

          // Verify authorization
          const authorized = await this.prisma.classArmSubjectTeacher.findFirst({
            where: { classArmSubjectId: existing.classArmSubjectId, teacherId: teacher.id, deletedAt: null },
          });
          if (!authorized) { result.failed.push({ assessmentScore: item, error: 'You are not authorized to modify this assessment score' }); continue; }

          if (item.score === null) {
            await this.prisma.classArmStudentAssessment.update({
              where: { id: item.id! },
              data: { deletedAt: new Date() },
            });
            result.success.push({
              id: existing.id, name: existing.name, score: 0, isExam: existing.isExam,
              studentId: existing.student.id,
              studentName: `${existing.student.user.firstName} ${existing.student.user.lastName}`,
              subjectName: subject.name, termName: term.name,
              createdAt: existing.createdAt, updatedAt: new Date(),
            } as any);
          } else {
            const updated = await this.prisma.classArmStudentAssessment.update({
              where: { id: item.id! },
              data: {
                ...(item.score !== undefined && { score: item.score }),
                ...(item.assessmentName && { name: item.assessmentName }),
                ...(item.isExam !== undefined && { isExam: item.isExam }),
              },
            });
            result.success.push({
              id: updated.id, name: updated.name, score: updated.score, isExam: updated.isExam,
              studentId: existing.student.id,
              studentName: `${existing.student.user.firstName} ${existing.student.user.lastName}`,
              subjectName: subject.name, termName: term.name, updatedAt: updated.updatedAt,
            } as any);
          }
        } catch (error) {
          result.failed.push({ assessmentScore: item, error: error.message || 'Update failed' });
        }
      }
    }

    // ── 7. Process upserts-by-student ──
    if (upsertItems.length > 0) {
      const studentIds = [...new Set(upsertItems.map(i => i.studentId!))];

      // Batch-fetch students
      const students = await this.prisma.student.findMany({
        where: { id: { in: studentIds }, user: { schoolId } },
        include: { user: true, classArmStudents: { where: { isActive: true } } },
      });
      const studentMap = new Map(students.map(s => [s.id, s]));

      // Resolve ClassArmSubjects for authorization (batch)
      const classArmIds = [...new Set(students.flatMap(s => s.classArmStudents.map(cas => cas.classArmId)))];
      const classArmSubjects = await this.prisma.classArmSubject.findMany({
        where: { classArmId: { in: classArmIds }, subjectId: subject.id, deletedAt: null },
      });
      const casMap = new Map(classArmSubjects.map(cas => [cas.classArmId, cas]));

      // Verify teacher authorization per ClassArmSubject
      const casIds = classArmSubjects.map(cas => cas.id);
      const authorizedTeachers = await this.prisma.classArmSubjectTeacher.findMany({
        where: { classArmSubjectId: { in: casIds }, teacherId: teacher.id, deletedAt: null },
      });
      const authorizedCasIds = new Set(authorizedTeachers.map(t => t.classArmSubjectId));

      // Batch-fetch existing assessments for these classArmSubjects + term
      const existingScores = casIds.length > 0
        ? await this.prisma.classArmStudentAssessment.findMany({
            where: {
              classArmSubjectId: { in: casIds },
              studentId: { in: studentIds },
              termId: term.id,
              deletedAt: null,
            },
          })
        : [];
      // Map: studentId -> assessmentName (lowercase) -> assessment
      const existingScoreMap = new Map<string, Map<string, any>>();
      for (const score of existingScores) {
        if (!existingScoreMap.has(score.studentId)) existingScoreMap.set(score.studentId, new Map());
        existingScoreMap.get(score.studentId)!.set(score.name.toLowerCase(), score);
      }

      for (const item of upsertItems) {
        try {
          const itemAssessmentName = (item.assessmentName || assessmentName)!;
          const student = studentMap.get(item.studentId!);
          if (!student) { result.failed.push({ assessmentScore: item, error: 'Student not found or not in your school' }); continue; }

          // Find ClassArmSubject for this student's class
          const studentClassArm = student.classArmStudents?.[0];
          if (!studentClassArm) { result.failed.push({ assessmentScore: item, error: 'Student is not enrolled in any class' }); continue; }

          const classArmSubject = casMap.get(studentClassArm.classArmId);
          if (!classArmSubject) { result.failed.push({ assessmentScore: item, error: 'Subject not assigned to student\'s class' }); continue; }
          if (!authorizedCasIds.has(classArmSubject.id)) { result.failed.push({ assessmentScore: item, error: 'You are not authorized to manage scores for this student' }); continue; }

          // Resolve assessment template entry
          let assessmentEntry: { id: string; maxScore: number; isExam: boolean } | undefined;
          if (template) {
            const entry = this.templateService.getAssessmentEntryByName(template, itemAssessmentName);
            if (entry) assessmentEntry = { id: entry.id, maxScore: entry.maxScore, isExam: entry.isExam };
          }
          const isExam = item.isExam !== undefined ? item.isExam : assessmentEntry?.isExam || false;

          // Check existing
          const existingForStudent = existingScoreMap.get(student.id);
          const existingAssessment = existingForStudent?.get(itemAssessmentName.toLowerCase());

          // score: null means delete
          if (item.score === null) {
            if (existingAssessment) {
              await this.prisma.classArmStudentAssessment.update({
                where: { id: existingAssessment.id },
                data: { deletedAt: new Date() },
              });
              existingForStudent?.delete(itemAssessmentName.toLowerCase());
              result.success.push({
                id: existingAssessment.id, name: existingAssessment.name, score: 0, isExam: existingAssessment.isExam,
                studentId: student.id, studentName: `${student.user.firstName} ${student.user.lastName}`,
                subjectName: subject.name, termName: term.name,
                createdAt: existingAssessment.createdAt, updatedAt: new Date(),
              });
            }
            continue;
          }

          let savedAssessment: any;
          if (existingAssessment) {
            savedAssessment = await this.prisma.classArmStudentAssessment.update({
              where: { id: existingAssessment.id },
              data: { score: item.score, name: itemAssessmentName, isExam },
            });
          } else {
            savedAssessment = await this.prisma.classArmStudentAssessment.upsert({
              where: {
                classArmSubjectId_studentId_termId_name: {
                  classArmSubjectId: classArmSubject.id,
                  studentId: student.id,
                  termId: term.id,
                  name: itemAssessmentName,
                },
              },
              update: { score: item.score, isExam },
              create: {
                classArmSubjectId: classArmSubject.id,
                studentId: student.id,
                termId: term.id,
                name: itemAssessmentName,
                score: item.score,
                isExam,
                assessmentTypeId: assessmentEntry?.id,
                maxScore: assessmentEntry?.maxScore,
              },
            });
            // Update local cache
            if (!existingScoreMap.has(student.id)) existingScoreMap.set(student.id, new Map());
            existingScoreMap.get(student.id)!.set(itemAssessmentName.toLowerCase(), savedAssessment);
          }

          result.success.push({
            id: savedAssessment.id, name: savedAssessment.name, score: savedAssessment.score, isExam: savedAssessment.isExam,
            studentId: student.id, studentName: `${student.user.firstName} ${student.user.lastName}`,
            subjectName: subject.name, termName: term.name,
            createdAt: savedAssessment.createdAt, updatedAt: savedAssessment.updatedAt,
          });
        } catch (error) {
          result.failed.push({ assessmentScore: item, error: error.message || 'Operation failed' });
        }
      }
    }

    return result;
  }

  // Attendance Management Methods

  /**
   * Mark class attendance for students by class teacher
   */
  async markClassAttendance(
    userId: string,
    dto: MarkClassAttendanceDto,
  ): Promise<ClassAttendanceResult> {
    // Verify teacher exists and is active
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
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Verify teacher is assigned as class teacher for this class arm
    const classArmTeacher = await this.prisma.classArmTeacher.findFirst({
      where: {
        teacherId: teacher.id,
        classArm: {
          id: dto.classArmId,
        },
        deletedAt: null,
      },
    });

    if (!classArmTeacher) {
      throw new ForbiddenException('You are not authorized to mark attendance for this class');
    }

    // Verify class arm exists and get details
    const classArm = await this.prisma.classArm.findFirst({
      where: {
        id: dto.classArmId,
        deletedAt: null,
      },
      include: {
        level: true,
      },
    });

    if (!classArm) {
      throw new NotFoundException('Class arm not found');
    }

    // Verify academic session and term exist
    const academicSession = await this.prisma.academicSession.findFirst({
      where: {
        id: dto.academicSessionId,
        schoolId: teacher.user.schoolId,
        deletedAt: null,
      },
    });

    if (!academicSession) {
      throw new NotFoundException('Academic session not found');
    }

    const term = await this.prisma.term.findFirst({
      where: {
        id: dto.termId,
        academicSessionId: dto.academicSessionId,
        deletedAt: null,
      },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    // Get students in the class arm with their ClassArmStudent records
    const students = await this.prisma.student.findMany({
      where: {
        classArmStudents: {
          some: {
            classArmId: dto.classArmId,
            isActive: true,
          },
        },
        deletedAt: null,
      },
      include: {
        user: true,
        classArmStudents: {
          where: {
            classArmId: dto.classArmId,
            isActive: true,
          },
        },
      },
    });

    const attendanceDate = new Date(dto.date);

    // Create or update attendance records
    const attendanceRecords = [];
    for (const studentAttendance of dto.studentAttendances) {
      // Verify student exists in the class
      const student = students.find((s) => s.id === studentAttendance.studentId);
      if (!student) {
        throw new NotFoundException(
          `Student with ID ${studentAttendance.studentId} not found in this class`,
        );
      }

      // Get the ClassArmStudent record for this student and class
      const classArmStudent = student.classArmStudents.find(
        (cas) => cas.classArmId === dto.classArmId && cas.isActive,
      );
      if (!classArmStudent) {
        throw new NotFoundException(
          `Student with ID ${studentAttendance.studentId} is not enrolled in this class`,
        );
      }

      // Upsert attendance record
      const attendanceRecord = await this.prisma.studentAttendance.upsert({
        where: {
          classArmStudentId_date: {
            classArmStudentId: classArmStudent.id,
            date: attendanceDate,
          },
        },
        update: {
          status: studentAttendance.status,
          ...(studentAttendance.remarks && { remarks: studentAttendance.remarks }),
          termId: dto.termId,
        },
        create: {
          classArmStudentId: classArmStudent.id,
          date: attendanceDate,
          status: studentAttendance.status,
          ...(studentAttendance.remarks && { remarks: studentAttendance.remarks }),
          termId: dto.termId,
        },
      });

      attendanceRecords.push({
        studentId: student.id,
        studentName: `${student.user.firstName} ${student.user.lastName}`,
        studentNo: student.studentNo,
        status: attendanceRecord.status,
        remarks: studentAttendance.remarks,
        date: attendanceRecord.date,
      });
    }

    // Calculate statistics
    const presentCount = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
    const absentCount = attendanceRecords.filter((r) => r.status === 'ABSENT').length;
    const lateCount = attendanceRecords.filter((r) => r.status === 'LATE').length;
    const excusedCount = attendanceRecords.filter((r) => r.status === 'EXCUSED').length;

    return {
      classArmId: dto.classArmId,
      classArmName: `${classArm.level.name} ${classArm.name}`,
      date: attendanceDate,
      academicSessionId: dto.academicSessionId,
      termId: dto.termId,
      attendanceRecords,
      totalStudents: attendanceRecords.length,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
    };
  }

  /**
   * Mark subject attendance for students by subject teacher
   */
  async markSubjectAttendance(
    userId: string,
    dto: MarkSubjectAttendanceDto,
  ): Promise<SubjectAttendanceResult> {
    // Verify teacher exists and is active
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
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Verify teacher is assigned to teach this subject for this class arm
    const classArmSubjectTeacher = await this.prisma.classArmSubjectTeacher.findFirst({
      where: {
        teacherId: teacher.id,
        deletedAt: null,
        classArmSubject: {
          classArmId: dto.classArmId,
          subjectId: dto.subjectId,
        },
      },
    });

    if (!classArmSubjectTeacher) {
      throw new ForbiddenException(
        'You are not authorized to mark attendance for this subject and class',
      );
    }

    // Verify subject exists
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: dto.subjectId,
        schoolId: teacher.user.schoolId,
        deletedAt: null,
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // Verify class arm exists and get details
    const classArm = await this.prisma.classArm.findFirst({
      where: {
        id: dto.classArmId,
        deletedAt: null,
      },
      include: {
        level: true,
      },
    });

    if (!classArm) {
      throw new NotFoundException('Class arm not found');
    }

    // Verify academic session and term exist
    const academicSession = await this.prisma.academicSession.findFirst({
      where: {
        id: dto.academicSessionId,
        schoolId: teacher.user.schoolId,
        deletedAt: null,
      },
    });

    if (!academicSession) {
      throw new NotFoundException('Academic session not found');
    }

    const term = await this.prisma.term.findFirst({
      where: {
        id: dto.termId,
        academicSessionId: dto.academicSessionId,
        deletedAt: null,
      },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    // Get students in the class arm with their ClassArmStudent records
    const students = await this.prisma.student.findMany({
      where: {
        classArmStudents: {
          some: {
            classArmId: dto.classArmId,
            isActive: true,
          },
        },
        deletedAt: null,
      },
      include: {
        user: true,
        classArmStudents: {
          where: {
            classArmId: dto.classArmId,
            isActive: true,
          },
        },
      },
    });

    const attendanceDate = new Date(dto.date);

    // Create or update attendance records
    const attendanceRecords = [];
    for (const studentAttendance of dto.studentAttendances) {
      // Verify student exists in the class
      const student = students.find((s) => s.id === studentAttendance.studentId);
      if (!student) {
        throw new NotFoundException(
          `Student with ID ${studentAttendance.studentId} not found in this class`,
        );
      }

      // Get the ClassArmStudent record for this student and class
      const classArmStudent = student.classArmStudents.find(
        (cas) => cas.classArmId === dto.classArmId && cas.isActive,
      );
      if (!classArmStudent) {
        throw new NotFoundException(
          `Student with ID ${studentAttendance.studentId} is not enrolled in this class`,
        );
      }

      // Upsert attendance record in the SubjectAttendance table
      const attendanceRecord = await this.prisma.subjectAttendance.upsert({
        where: {
          classArmStudentId_date_subjectId: {
            classArmStudentId: classArmStudent.id,
            date: attendanceDate,
            subjectId: dto.subjectId,
          },
        },
        update: {
          status: studentAttendance.status,
          termId: dto.termId,
        },
        create: {
          classArmStudentId: classArmStudent.id,
          date: attendanceDate,
          status: studentAttendance.status,
          subjectId: dto.subjectId,
          termId: dto.termId,
        },
      });

      attendanceRecords.push({
        studentId: student.id,
        studentName: `${student.user.firstName} ${student.user.lastName}`,
        studentNo: student.studentNo,
        status: attendanceRecord.status,
        remarks: studentAttendance.remarks,
        date: attendanceRecord.date,
      });
    }

    // Calculate statistics
    const presentCount = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
    const absentCount = attendanceRecords.filter((r) => r.status === 'ABSENT').length;
    const lateCount = attendanceRecords.filter((r) => r.status === 'LATE').length;
    const excusedCount = attendanceRecords.filter((r) => r.status === 'EXCUSED').length;

    return {
      subjectId: dto.subjectId,
      subjectName: subject.name,
      classArmId: dto.classArmId,
      classArmName: classArm.name,
      date: attendanceDate,
      academicSessionId: dto.academicSessionId,
      termId: dto.termId,
      attendanceRecords,
      totalStudents: attendanceRecords.length,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
    };
  }

  /**
   * Get current academic session and term for the teacher's school
   */
  async getCurrentAcademicSession(userId: string) {
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
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Get current academic session
    const currentSession = await this.prisma.academicSession.findFirst({
      where: {
        schoolId: teacher.user.schoolId,
        isCurrent: true,
        deletedAt: null,
      },
    });

    if (!currentSession) {
      // Return empty data for new schools without academic sessions
      return {
        currentSession: null,
        currentTerm: null,
      };
    }

    // Get current term
    const currentTerm = await this.prisma.term.findFirst({
      where: {
        academicSessionId: currentSession.id,
        isCurrent: true,
        deletedAt: null,
      },
    });

    if (!currentTerm) {
      throw new NotFoundException('No current term found');
    }

    return {
      currentSession: {
        id: currentSession.id,
        academicYear: currentSession.academicYear,
        startDate: currentSession.startDate,
        endDate: currentSession.endDate,
        isCurrent: currentSession.isCurrent,
      },
      currentTerm: {
        id: currentTerm.id,
        name: currentTerm.name,
        academicSessionId: currentTerm.academicSessionId,
        isCurrent: currentTerm.isCurrent,
      },
    };
  }

  /**
   * Check if attendance has been taken for a class on a specific date
   */
  async checkClassAttendanceStatus(userId: string, classArmId: string, date: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId, deletedAt: null },
      include: { user: { include: { school: true } } },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    // Check if teacher is authorized to mark attendance for this class
    // Allow both class teachers and subject teachers
    const classArmTeacher = await this.prisma.classArmTeacher.findFirst({
      where: { teacherId: teacher.id, classArmId, deletedAt: null },
    });

    const subjectTeacher = await this.prisma.classArmSubjectTeacher.findFirst({
      where: { teacherId: teacher.id, deletedAt: null, classArmSubject: { classArmId } },
    });

    if (!classArmTeacher && !subjectTeacher) {
      throw new ForbiddenException('You are not authorized to mark attendance for this class');
    }

    // Parse the date string and create proper date boundaries
    // Handle both 'YYYY-MM-DD' format and full ISO strings
    let attendanceDate: Date;
    if (date.includes('T')) {
      // Full ISO string
      attendanceDate = new Date(date);
    } else {
      // Date string like '2025-10-17' - create in local timezone
      const [year, month, day] = date.split('-').map(Number);
      attendanceDate = new Date(year, month - 1, day); // month is 0-indexed
    }
    const startOfDay = new Date(
      attendanceDate.getFullYear(),
      attendanceDate.getMonth(),
      attendanceDate.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfDay = new Date(
      attendanceDate.getFullYear(),
      attendanceDate.getMonth(),
      attendanceDate.getDate(),
      23,
      59,
      59,
      999,
    );

    // Check if any attendance records exist for this class on this date
    const attendanceCount = await this.prisma.studentAttendance.count({
      where: {
        classArmStudent: {
          classArmId,
        },
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        deletedAt: null,
      },
    });

    return {
      classArmId,
      date: attendanceDate,
      hasAttendanceBeenTaken: attendanceCount > 0,
      attendanceCount,
    };
  }

  /**
   * Check if subject attendance has been taken for a class/subject on a specific date
   */
  async checkSubjectAttendanceStatus(userId: string, classArmId: string, subjectId: string, date: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId, deletedAt: null },
      include: { user: { include: { school: true } } },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    // Check if teacher is authorized (subject teacher or class teacher)
    const classArmTeacher = await this.prisma.classArmTeacher.findFirst({
      where: { teacherId: teacher.id, classArmId, deletedAt: null },
    });
    const subjectTeacher = await this.prisma.classArmSubjectTeacher.findFirst({
      where: { teacherId: teacher.id, deletedAt: null, classArmSubject: { classArmId, subjectId } },
    });
    if (!classArmTeacher && !subjectTeacher) {
      throw new ForbiddenException('You are not authorized to check attendance for this subject and class');
    }

    // Parse date
    let attendanceDate: Date;
    if (date.includes('T')) {
      attendanceDate = new Date(date);
    } else {
      const [year, month, day] = date.split('-').map(Number);
      attendanceDate = new Date(year, month - 1, day);
    }
    const startOfDay = new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate(), 23, 59, 59, 999);

    const attendanceCount = await this.prisma.subjectAttendance.count({
      where: {
        classArmStudent: { classArmId },
        subjectId,
        date: { gte: startOfDay, lte: endOfDay },
        deletedAt: null,
      },
    });

    return {
      classArmId,
      subjectId,
      date: attendanceDate,
      hasAttendanceBeenTaken: attendanceCount > 0,
      attendanceCount,
    };
  }

  /**
   * Get existing subject attendance data for a class/subject on a specific date
   */
  async getSubjectAttendanceData(userId: string, classArmId: string, subjectId: string, date: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId, deletedAt: null },
      include: { user: { include: { school: true } } },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    // Check if teacher is authorized
    const classArmTeacher = await this.prisma.classArmTeacher.findFirst({
      where: { teacherId: teacher.id, classArmId, deletedAt: null },
    });
    const subjectTeacher = await this.prisma.classArmSubjectTeacher.findFirst({
      where: { teacherId: teacher.id, deletedAt: null, classArmSubject: { classArmId, subjectId } },
    });
    if (!classArmTeacher && !subjectTeacher) {
      throw new ForbiddenException('You are not authorized to view attendance for this subject and class');
    }

    // Parse date
    let attendanceDate: Date;
    if (date.includes('T')) {
      attendanceDate = new Date(date);
    } else {
      const [year, month, day] = date.split('-').map(Number);
      attendanceDate = new Date(year, month - 1, day);
    }
    const startOfDay = new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate(), 23, 59, 59, 999);

    // Get class arm info
    const classArm = await this.prisma.classArm.findFirst({
      where: { id: classArmId, deletedAt: null },
      include: { level: true },
    });
    if (!classArm) throw new NotFoundException('Class arm not found');

    // Get all students in the class
    const students = await this.prisma.student.findMany({
      where: {
        classArmStudents: { some: { classArmId, isActive: true } },
        deletedAt: null,
      },
      include: {
        user: true,
        classArmStudents: { where: { classArmId, isActive: true } },
      },
    });

    // Get subject attendance records for this date and subject
    const attendanceRecords = await this.prisma.subjectAttendance.findMany({
      where: {
        classArmStudent: { classArmId },
        subjectId,
        date: { gte: startOfDay, lte: endOfDay },
        deletedAt: null,
      },
    });

    // Create attendance data for all students
    const attendanceData = students.map((student) => {
      const classArmStudent = student.classArmStudents[0];
      const attendanceRecord = classArmStudent
        ? attendanceRecords.find((record) => record.classArmStudentId === classArmStudent.id)
        : undefined;
      return {
        studentId: student.id,
        studentName: `${student.user.firstName} ${student.user.lastName}`,
        studentNo: student.studentNo,
        status: attendanceRecord?.status || 'ABSENT',
        remarks: '',
        date: attendanceRecord?.date || attendanceDate,
      };
    });

    // Calculate statistics
    const presentCount = attendanceData.filter((record) => record.status === 'PRESENT').length;
    const absentCount = attendanceData.filter((record) => record.status === 'ABSENT').length;
    const lateCount = attendanceData.filter((record) => record.status === 'LATE').length;
    const excusedCount = attendanceData.filter((record) => record.status === 'EXCUSED').length;
    const totalStudents = attendanceData.length;
    const attendancePercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    return {
      classArmId,
      subjectId,
      classArmName: classArm.name,
      date: attendanceDate,
      attendanceData,
      totalStudents,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      attendancePercentage,
    };
  }

  /**
   * Get existing attendance data for a class on a specific date
   */
  async getClassAttendanceData(userId: string, classArmId: string, date: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId, deletedAt: null },
      include: { user: { include: { school: true } } },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    // Check if teacher is authorized to view attendance for this class
    // Allow both class teachers and subject teachers
    const classArmTeacher = await this.prisma.classArmTeacher.findFirst({
      where: { teacherId: teacher.id, classArmId, deletedAt: null },
    });

    const subjectTeacher = await this.prisma.classArmSubjectTeacher.findFirst({
      where: { teacherId: teacher.id, deletedAt: null, classArmSubject: { classArmId } },
    });

    if (!classArmTeacher && !subjectTeacher) {
      throw new ForbiddenException('You are not authorized to view attendance for this class');
    }

    // Parse the date string and create proper date boundaries
    // Handle both 'YYYY-MM-DD' format and full ISO strings
    let attendanceDate: Date;
    if (date.includes('T')) {
      attendanceDate = new Date(date);
    } else {
      const [year, month, day] = date.split('-').map(Number);
      attendanceDate = new Date(year, month - 1, day);
    }
    const startOfDay = new Date(
      attendanceDate.getFullYear(),
      attendanceDate.getMonth(),
      attendanceDate.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfDay = new Date(
      attendanceDate.getFullYear(),
      attendanceDate.getMonth(),
      attendanceDate.getDate(),
      23,
      59,
      59,
      999,
    );

    // Get class arm information
    const classArm = await this.prisma.classArm.findFirst({
      where: { id: classArmId, deletedAt: null },
      include: { level: true },
    });
    if (!classArm) throw new NotFoundException('Class arm not found');

    // Get all students in the class with their classArmStudent records
    const students = await this.prisma.student.findMany({
      where: {
        classArmStudents: {
          some: {
            classArmId,
            isActive: true,
          },
        },
        deletedAt: null,
      },
      include: {
        user: true,
        classArmStudents: {
          where: { classArmId, isActive: true },
        },
      },
    });

    // Get attendance records for this date
    const attendanceRecords = await this.prisma.studentAttendance.findMany({
      where: {
        classArmStudent: {
          classArmId,
        },
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        deletedAt: null,
      },
    });

    // Create attendance data for all students
    const attendanceData = students.map((student) => {
      const classArmStudent = student.classArmStudents[0];
      const attendanceRecord = classArmStudent
        ? attendanceRecords.find(
            (record) => record.classArmStudentId === classArmStudent.id,
          )
        : undefined;
      return {
        studentId: student.id,
        studentName: `${student.user.firstName} ${student.user.lastName}`,
        studentNo: student.studentNo,
        status: attendanceRecord?.status || 'ABSENT',
        remarks: (attendanceRecord as any)?.remarks || '',
        date: attendanceRecord?.date || attendanceDate,
      };
    });

    // Calculate statistics
    const presentCount = attendanceData.filter((record) => record.status === 'PRESENT').length;
    const absentCount = attendanceData.filter((record) => record.status === 'ABSENT').length;
    const lateCount = attendanceData.filter((record) => record.status === 'LATE').length;
    const excusedCount = attendanceData.filter((record) => record.status === 'EXCUSED').length;
    const totalStudents = attendanceData.length;
    const attendancePercentage =
      totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    return {
      classArmId,
      classArmName: classArm.name,
      date: attendanceDate,
      attendanceData,
      totalStudents,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      attendancePercentage,
    };
  }

  // Classroom Broadsheet methods
  async getClassroomBroadsheet(userId: string, classArmId: string) {
    const { schoolId } = await this.verifyClassTeacher(userId, classArmId);
    return this.classroomBroadsheetBuilder.buildBroadsheetData(schoolId, classArmId);
  }

  async downloadClassroomBroadsheet(userId: string, classArmId: string, termId?: string, isCumulative?: boolean): Promise<Buffer> {
    const { schoolId } = await this.verifyClassTeacher(userId, classArmId);
    const data = await this.classroomBroadsheetBuilder.buildBroadsheetData(schoolId, classArmId);
    return this.classroomBroadsheetBuilder.generateBroadsheetExcel(data, termId, isCumulative);
  }

  private async verifyClassTeacher(
    userId: string,
    classArmId: string,
  ): Promise<{ schoolId: string; teacherId: string }> {
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId, deletedAt: null },
      include: { user: { select: { schoolId: true } } },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const classArm = await this.prisma.classArm.findFirst({
      where: {
        id: classArmId,
        deletedAt: null,
        academicSession: { isCurrent: true },
      },
    });

    if (!classArm) {
      throw new NotFoundException('Class not found in current session');
    }

    if (classArm.classTeacherId !== teacher.id) {
      throw new ForbiddenException('You are not the class teacher for this classroom');
    }

    return { schoolId: teacher.user.schoolId, teacherId: teacher.id };
  }
}
