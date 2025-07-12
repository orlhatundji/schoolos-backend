import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  LoggerService,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { WinstonLoggerService } from './logger/winston-logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger: LoggerService;
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {
    this.logger = new WinstonLoggerService(AllExceptionsFilter.name);
  }

  catch(exception: any, host: ArgumentsHost): void {
    const isHttpException = exception instanceof HttpException;

    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    const httpStatus = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let response;
    if (exception.getResponse) {
      response = exception.getResponse();
      response.status = response.statusCode;
      delete response.statusCode;
    } else {
      response = { status: httpStatus };
    }

    const responseBody = {
      ...response,
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      timestamp: new Date().toISOString(),
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);

    // this must happen last as the logger changes the exception object
    if (!isHttpException) {
      this.logger.error(exception.stack ?? exception.toString());
    } else {
      this.logger.error(exception);
    }
  }
}
