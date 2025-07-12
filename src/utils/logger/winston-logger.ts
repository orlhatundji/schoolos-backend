import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { winstonOptions } from './winston-config';
const { combine, timestamp, label, prettyPrint, splat } = winston.format;

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor(name: string) {
    this.logger = winston.createLogger({
      format: combine(label({ label: name }), timestamp(), prettyPrint(), splat()),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File(winstonOptions.file),
      ],
      exitOnError: false,
    });
  }
  private shouldLog = process.env.NODE_ENV !== 'test';

  private wrapCall(fn: winston.LeveledLogMethod, message: any) {
    if (this.shouldLog) {
      fn(message);
    }
  }

  log(message: any) {
    if (this.shouldLog) {
      this.logger.log('info', message);
    }
  }

  info(message: any) {
    this.wrapCall(this.logger.info, message);
  }

  error(message: any) {
    this.wrapCall(this.logger.error, message);
  }

  warn(message: any) {
    this.wrapCall(this.logger.warn, message);
  }

  debug(message: any) {
    this.wrapCall(this.logger.debug, message);
  }
}
