import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { winstonOptions } from './winston-config';
const { combine, timestamp, label, splat, json, prettyPrint } = winston.format;

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor(name: string) {
    this.logger = winston.createLogger({
      format: combine(label({ label: name }), timestamp(), splat(), json()),
      transports: [
        new winston.transports.Console({
          format: combine(label({ label: name }), timestamp(), splat(), prettyPrint()),
        }),
        new winston.transports.File(winstonOptions.file),
        ...winstonOptions.getLokiTransports(),
      ],
      exitOnError: false,
    });
  }

  private shouldLog = process.env.NODE_ENV !== 'test';

  log(message: string, meta?: Record<string, any>) {
    if (this.shouldLog) {
      this.logger.info(message, meta);
    }
  }

  info(message: string, meta?: Record<string, any>) {
    if (this.shouldLog) {
      this.logger.info(message, meta);
    }
  }

  error(message: string, meta?: Record<string, any>) {
    if (this.shouldLog) {
      this.logger.error(message, meta);
    }
  }

  warn(message: string, meta?: Record<string, any>) {
    if (this.shouldLog) {
      this.logger.warn(message, meta);
    }
  }

  debug(message: string, meta?: Record<string, any>) {
    if (this.shouldLog) {
      this.logger.debug(message, meta);
    }
  }
}
