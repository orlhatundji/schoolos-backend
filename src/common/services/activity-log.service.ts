import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma';

export interface ActivityLogData {
  userId: string;
  schoolId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: any;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  category?: string;
}

export interface ActivityLogQuery {
  userId?: string;
  schoolId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  severity?: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a user activity
   */
  async logActivity(data: ActivityLogData) {
    try {
      // Get user information for notification message
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
        select: { firstName: true, lastName: true },
      });

      const userName = user ? `${user.firstName} ${user.lastName}` : undefined;

      // Generate descriptive notification message
      const notificationMessage = this.generateNotificationMessage(
        data.action,
        data.entityType,
        data.details,
        userName,
      );

      const activity = await this.prisma.userActivity.create({
        data: {
          userId: data.userId,
          schoolId: data.schoolId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          details: data.details ? JSON.parse(JSON.stringify(data.details)) : null,
          description: data.description || notificationMessage,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          requestId: data.requestId,
          severity: data.severity || 'INFO',
          category: data.category,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              type: true,
            },
          },
        },
      });

      // Add notification message to the response
      return {
        ...activity,
        notificationMessage,
      };
    } catch (error) {
      // Don't let logging errors break the main application
      console.error('Failed to log activity:', error);
      return null;
    }
  }

  /**
   * Log user login activity
   */
  async logLogin(userId: string, schoolId: string, ipAddress?: string, userAgent?: string) {
    return this.logActivity({
      userId,
      schoolId,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: userId,
      description: 'User logged into the system',
      ipAddress,
      userAgent,
      category: 'AUTHENTICATION',
      severity: 'INFO',
    });
  }

  /**
   * Log user logout activity
   */
  async logLogout(userId: string, schoolId: string, ipAddress?: string, userAgent?: string) {
    return this.logActivity({
      userId,
      schoolId,
      action: 'LOGOUT',
      entityType: 'USER',
      entityId: userId,
      description: 'User logged out of the system',
      ipAddress,
      userAgent,
      category: 'AUTHENTICATION',
      severity: 'INFO',
    });
  }

  /**
   * Log CRUD operations
   */
  async logCreate(
    userId: string,
    schoolId: string,
    entityType: string,
    entityId: string,
    details?: any,
    description?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.logActivity({
      userId,
      schoolId,
      action: 'CREATE',
      entityType,
      entityId,
      details,
      description: description || `Created new ${entityType.toLowerCase()}`,
      ipAddress,
      userAgent,
      category: 'DATA_MANAGEMENT',
      severity: 'INFO',
    });
  }

  async logUpdate(
    userId: string,
    schoolId: string,
    entityType: string,
    entityId: string,
    oldValues?: any,
    newValues?: any,
    description?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.logActivity({
      userId,
      schoolId,
      action: 'UPDATE',
      entityType,
      entityId,
      details: {
        oldValues,
        newValues,
        changes: this.getChanges(oldValues, newValues),
      },
      description: description || `Updated ${entityType.toLowerCase()}`,
      ipAddress,
      userAgent,
      category: 'DATA_MANAGEMENT',
      severity: 'INFO',
    });
  }

  async logDelete(
    userId: string,
    schoolId: string,
    entityType: string,
    entityId: string,
    details?: any,
    description?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.logActivity({
      userId,
      schoolId,
      action: 'DELETE',
      entityType,
      entityId,
      details,
      description: description || `Deleted ${entityType.toLowerCase()}`,
      ipAddress,
      userAgent,
      category: 'DATA_MANAGEMENT',
      severity: 'WARNING',
    });
  }

  /**
   * Log payment activities
   */
  async logPayment(
    userId: string,
    schoolId: string,
    action: string,
    paymentId: string,
    details?: any,
    description?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.logActivity({
      userId,
      schoolId,
      action,
      entityType: 'PAYMENT',
      entityId: paymentId,
      details,
      description,
      ipAddress,
      userAgent,
      category: 'FINANCIAL',
      severity: 'INFO',
    });
  }

  /**
   * Log attendance activities
   */
  async logAttendance(
    userId: string,
    schoolId: string,
    action: string,
    attendanceId: string,
    details?: any,
    description?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.logActivity({
      userId,
      schoolId,
      action,
      entityType: 'ATTENDANCE',
      entityId: attendanceId,
      details,
      description,
      ipAddress,
      userAgent,
      category: 'ACADEMIC',
      severity: 'INFO',
    });
  }

  /**
   * Log assessment activities
   */
  async logAssessment(
    userId: string,
    schoolId: string,
    action: string,
    assessmentId: string,
    details?: any,
    description?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.logActivity({
      userId,
      schoolId,
      action,
      entityType: 'ASSESSMENT',
      entityId: assessmentId,
      details,
      description,
      ipAddress,
      userAgent,
      category: 'ACADEMIC',
      severity: 'INFO',
    });
  }

  /**
   * Query activity logs
   */
  async queryActivities(query: ActivityLogQuery) {
    const where: any = {};

    if (query.userId) where.userId = query.userId;
    if (query.schoolId) where.schoolId = query.schoolId;
    if (query.action) where.action = query.action;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.severity) where.severity = query.severity;
    if (query.category) where.category = query.category;

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = query.startDate;
      if (query.endDate) where.timestamp.lte = query.endDate;
    }

    const [activities, total] = await Promise.all([
      this.prisma.userActivity.findMany({
        where,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              type: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: query.limit || 50,
        skip: query.offset || 0,
      }),
      this.prisma.userActivity.count({ where }),
    ]);

    return {
      activities,
      total,
      limit: query.limit || 50,
      offset: query.offset || 0,
    };
  }

  /**
   * Get recent activities for dashboard
   */
  async getRecentActivities(schoolId: string, limit: number = 10) {
    return this.prisma.userActivity.findMany({
      where: { schoolId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            type: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Get activity summary for dashboard
   */
  async getActivitySummary(schoolId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await this.prisma.userActivity.findMany({
      where: {
        schoolId,
        timestamp: { gte: startDate },
      },
      select: {
        action: true,
        category: true,
        severity: true,
      },
    });

    const summary = {
      totalActivities: activities.length,
      byAction: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
    };

    activities.forEach((activity) => {
      summary.byAction[activity.action] = (summary.byAction[activity.action] || 0) + 1;
      if (activity.category) {
        summary.byCategory[activity.category] = (summary.byCategory[activity.category] || 0) + 1;
      }
      summary.bySeverity[activity.severity] = (summary.bySeverity[activity.severity] || 0) + 1;
    });

    return summary;
  }

  /**
   * Helper method to get changes between old and new values
   */
  private getChanges(oldValues: any, newValues: any): Record<string, { old: any; new: any }> {
    if (!oldValues || !newValues) return {};

    const changes: Record<string, { old: any; new: any }> = {};
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

    allKeys.forEach((key) => {
      if (oldValues[key] !== newValues[key]) {
        changes[key] = {
          old: oldValues[key],
          new: newValues[key],
        };
      }
    });

    return changes;
  }

  /**
   * Helper method to generate descriptive notification messages
   */
  private generateNotificationMessage(
    action: string,
    entityType: string,
    details?: any,
    userName?: string,
  ): string {
    let message = `${action} ${entityType}`;

    if (details) {
      if (details.changes && Object.keys(details.changes).length > 0) {
        message += ` with changes: ${JSON.stringify(details.changes)}`;
      } else if (details.description) {
        message += `: ${details.description}`;
      } else if (details.reason) {
        message += `: ${details.reason}`;
      } else if (details.message) {
        message += `: ${details.message}`;
      } else {
        message += `: ${JSON.stringify(details)}`;
      }
    }

    if (userName && !details?.skipUserName) {
      message += ` by ${userName}`;
    }

    return message;
  }
}
