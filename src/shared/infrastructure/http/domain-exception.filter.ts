import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Response } from 'express';

import { DomainError, NotFoundError, ValidationError } from '../../domain/errors/domain.error';

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json(exception.getResponse());
      return;
    }

    if (exception instanceof DomainError) {
      const status = this.mapStatus(exception);
      response.status(status).json({
        statusCode: status,
        message: exception.message,
        error: exception.name,
      });
      return;
    }

    this.logger.error(exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }

  private mapStatus(exception: DomainError): number {
    if (exception instanceof NotFoundError) return HttpStatus.NOT_FOUND;
    if (exception instanceof ValidationError) return HttpStatus.BAD_REQUEST;
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
