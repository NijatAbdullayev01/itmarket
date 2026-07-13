import {
  ArgumentsHost,
  Catch,
  HttpException,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { ApiErrorEnvelope } from '@itmarket/contracts';
import { Prisma } from '../generated/prisma/client';
import { CORRELATION_ID_HEADER } from './correlation-id.middleware';

type RequestWithId = Request & { id?: string };

interface ErrorBody {
  code?: unknown;
  details?: unknown;
  error?: unknown;
  message?: unknown;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<Response>();
    const correlationId =
      request.id ?? request.header(CORRELATION_ID_HEADER) ?? randomUUID();
    const status = this.status(exception);
    const body = this.extractBody(exception);

    if (status >= 500) {
      this.logger.error(
        {
          correlationId,
          method: request.method,
          path: request.originalUrl,
          exception,
        },
        'Request failed',
      );
    }

    response.setHeader(CORRELATION_ID_HEADER, correlationId);
    const payload: ApiErrorEnvelope = {
      code: this.errorCode(status, body),
      message: this.errorMessage(status, body),
      details: this.errorDetails(status, body),
      correlationId,
    };
    response.status(status).json(payload);
  }

  private status(exception: unknown): number {
    if (exception instanceof HttpException) return exception.getStatus();
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') return 409;
      if (exception.code === 'P2025') return 404;
    }
    return 500;
  }

  private extractBody(exception: unknown): ErrorBody {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return { code: 'UNIQUE_CONFLICT', message: 'Resource already exists' };
      }
      if (exception.code === 'P2025') {
        return { code: 'NOT_FOUND', message: 'Resource not found' };
      }
    }
    if (!(exception instanceof HttpException)) return {};

    const response = exception.getResponse();
    return typeof response === 'string' ? { message: response } : response;
  }

  private errorCode(status: number, body: ErrorBody): string {
    if (typeof body.code === 'string') {
      return body.code;
    }
    if (status === 400 && Array.isArray(body.message)) {
      return 'VALIDATION_ERROR';
    }
    return `HTTP_${status}`;
  }

  private errorMessage(status: number, body: ErrorBody): string {
    if (typeof body.message === 'string') {
      return body.message;
    }
    if (Array.isArray(body.message)) {
      return 'Request validation failed';
    }
    if (status >= 500) {
      return 'Internal server error';
    }
    return typeof body.error === 'string' ? body.error : 'Request failed';
  }

  private errorDetails(status: number, body: ErrorBody): unknown {
    if (body.details !== undefined) {
      return body.details;
    }
    if (status >= 500) {
      return null;
    }
    return Array.isArray(body.message) ? body.message : null;
  }
}
