import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WinstonLoggerService } from '../../utils/logger/winston-logger';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private logger = new WinstonLoggerService('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const statusCode = res.statusCode;
      const logMethod = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

      const meta: Record<string, any> = {
        method: req.method,
        url: req.originalUrl,
        statusCode: String(statusCode),
        responseTime: String(duration),
        userAgent: req.get('user-agent') || '',
        ip: req.ip || '',
      };

      if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        const { password, ...safeBody } = req.body;
        meta.body = JSON.stringify(safeBody);
      }

      this.logger[logMethod](`${req.method} ${req.originalUrl} ${statusCode} ${duration}ms`, meta);
    });

    next();
  }
}
