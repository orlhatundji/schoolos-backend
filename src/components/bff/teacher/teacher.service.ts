import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../prisma';
import { PasswordHasher } from '../../../utils/hasher';
import { PaystackService } from '../../../shared/services/paystack.service';
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
      id: cast.classArm.id,
      name: cast.classArm.name,
      level: cast.classArm.level.name,
      subject: cast.subject.name,
      studentsCount: cast.classArm.classArmStudents.length,
      nextClassTime: this.getNextClassTime(cast.classArm.id),
      location: (cast.classArm as any).location || undefined,
      isClassTeacher: teacher.classArmsAsTeacher.some((cat) => cat.id === cast.classArm.id),
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
          .reduce((sum, cast) => sum + cast.classArm.classArmStudents.length, 0),
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
        classArmSubjectTeachers: {
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

  // Update teacher profile information
  async updateTeacherProfile(userId: string, updateData: any): Promise<TeacherProfile> {
    const teacher = await this.getTeacherWithRelations(userId);

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

    // Check for phone number conflicts if phone is being updated
    if (updateData.phone && updateData.phone !== teacher.user.phone) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          phone: updateData.phone,
          schoolId: teacher.user.schoolId,
          id: { not: teacher.userId },
        },
      });

      if (existingUser) {
        throw new ConflictException(
          'Phone number is already in use by another user in this school',
        );
      }
    }

    // Check for email conflicts if email is being updated
    if (updateData.email && updateData.email !== teacher.user.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: updateData.email,
          schoolId: teacher.user.schoolId,
          id: { not: teacher.userId },
        },
      });

      if (existingUser) {
        throw new ConflictException(
          'Email address is already in use by another user in this school',
        );
      }
    }

    // Update user if there are changes
    if (Object.keys(userUpdateData).length > 0) {
      await this.prisma.user.update({
        where: { id: teacher.userId },
        data: userUpdateData,
      });
    }

    // Get updated teacher data
    const updatedTeacher = await this.getTeacherWithRelations(userId);

    return {
      teacherNo: updatedTeacher.teacherNo,
      firstName: updatedTeacher.user.firstName,
      lastName: updatedTeacher.user.lastName,
      email: updatedTeacher.user.email,
      phone: updatedTeacher.user.phone,
      department: (updatedTeacher as any).department?.name || 'Unassigned',
      status: updatedTeacher.status,
      employmentType: updatedTeacher.employmentType,
      qualification: updatedTeacher.qualification,
      joinDate: updatedTeacher.joinDate.toISOString(),
      avatar: updatedTeacher.user.avatarUrl,
    };
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async getAttendanceRate(_teacherId: string, _sessionId: string, _termId?: string) {
    // For new teachers with no data, return 0
    return 0;
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
        classArmStudents: {
          where: { isActive: true },
          include: {
            student: {
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
      throw new NotFoundException(
        `Class ${level} ${classArm} not found in the current academic session. Please contact the administrator to set up class arms for the current session.`,
      );
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
      (classArmData as any).classArmStudents.map(async (classArmStudent: any) => {
        const student = classArmStudent.student;
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
        classArmId: student.classArmStudents?.[0]?.classArmId || '',
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
              include: {
                user: true,
                classArmStudents: {
                  where: { isActive: true },
                  include: {
                    classArm: true,
                  },
                },
              },
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
        classArmId:
          existingAssessment.subjectTermStudent.student.classArmStudents?.[0]?.classArmId || '',
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
              include: {
                user: true,
                classArmStudents: {
                  where: { isActive: true },
                  include: {
                    classArm: true,
                  },
                },
              },
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
        classArmId:
          existingAssessment.subjectTermStudent.student.classArmStudents?.[0]?.classArmId || '',
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
            throw new Error(
              'subjectName, termName, and assessmentName are required for new assessment scores (must be provided at top level)',
            );
          }

          // Check if assessment score already exists for this student/subject/term/assessment
          const existingAssessment = await this.findExistingAssessmentScore(
            item.studentId,
            subjectName,
            termName,
            assessmentName,
            teacher.user.schoolId,
          );

          if (existingAssessment) {
            // Update existing assessment score
            const updateData = {
              score: item.score,
              assessmentName: assessmentName,
              isExam: item.isExam,
            };
            const assessmentScore = await this.updateStudentAssessmentScore(
              userId,
              existingAssessment.id,
              updateData,
            );
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
              if (
                error.code === 'P2002' &&
                error.meta?.target?.includes('unique_assessment_per_student_term')
              ) {
                throw new Error(
                  'Assessment score already exists for this student. Use update instead of create.',
                );
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
        subjectId: dto.subjectId,
        classArm: {
          id: dto.classArmId,
        },
        deletedAt: null,
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

    // Get students in the class arm
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

      // Upsert attendance record
      const attendanceRecord = await this.prisma.studentAttendance.upsert({
        where: {
          classArmStudentId_date: {
            classArmStudentId: studentAttendance.studentId,
            date: attendanceDate,
          },
        },
        update: {
          status: studentAttendance.status,
          ...(studentAttendance.remarks && { remarks: studentAttendance.remarks }),
          termId: dto.termId,
        },
        create: {
          classArmStudentId: studentAttendance.studentId,
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
      where: { teacherId: teacher.id, classArmId, deletedAt: null },
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
      where: { teacherId: teacher.id, classArmId, deletedAt: null },
    });

    if (!classArmTeacher && !subjectTeacher) {
      throw new ForbiddenException('You are not authorized to view attendance for this class');
    }

    const attendanceDate = new Date(date);
    const startOfDay = new Date(
      attendanceDate.getFullYear(),
      attendanceDate.getMonth(),
      attendanceDate.getDate(),
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

    // Get all students in the class
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
      include: { user: true },
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
      const attendanceRecord = attendanceRecords.find(
        (record) => record.classArmStudentId === student.id,
      );
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
}
