import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ActivityLogService } from '../services/activity-log.service';
import { LOG_ACTIVITY_KEY, LogActivityOptions } from '../decorators/log-activity.decorator';
import { GetCurrentUserId } from '../decorators';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly activityLogService: ActivityLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const logOptions = this.reflector.get<LogActivityOptions>(
      LOG_ACTIVITY_KEY,
      context.getHandler(),
    );

    if (!logOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const schoolId = request.user?.schoolId;
    const ipAddress = request.ip || request.connection?.remoteAddress;
    const userAgent = request.headers['user-agent'];

    if (!userId || !schoolId) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (result) => {
        try {
          const args = this.getMethodArgs(context);

          const entityId =
            typeof logOptions.entityId === 'function'
              ? logOptions.entityId(args)
              : logOptions.entityId;

          const description =
            typeof logOptions.description === 'function'
              ? logOptions.description(args)
              : logOptions.description;

          const details = logOptions.details ? logOptions.details(args, result) : undefined;

          await this.activityLogService.logActivity({
            userId,
            schoolId,
            action: logOptions.action,
            entityType: logOptions.entityType,
            entityId,
            description,
            details,
            ipAddress,
            userAgent,
            category: logOptions.category,
            severity: logOptions.severity,
          });
        } catch (error) {
          // Don't let logging errors break the main application
          console.error('Failed to log activity in interceptor:', error);
        }
      }),
    );
  }

  private getMethodArgs(context: ExecutionContext): any[] {
    const args = context.getArgs();
    return args;
  }
}
