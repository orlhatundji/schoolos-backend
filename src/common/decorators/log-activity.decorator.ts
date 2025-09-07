import { SetMetadata } from '@nestjs/common';

export interface LogActivityOptions {
  action: string;
  entityType: string;
  entityId?: string | ((args: any[]) => string);
  description?: string | ((args: any[]) => string);
  category?: string;
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  details?: (args: any[], result: any) => any;
}

export const LOG_ACTIVITY_KEY = 'logActivity';

export const LogActivity = (options: LogActivityOptions) => SetMetadata(LOG_ACTIVITY_KEY, options);
