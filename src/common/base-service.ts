import { LoggerService } from '@nestjs/common';
import { WinstonLoggerService } from '../utils/logger/winston-logger';

export abstract class BaseService {
  public readonly logger: LoggerService;

  constructor(name: string) {
    this.logger = new WinstonLoggerService(name);
  }
}
