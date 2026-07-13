import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

type RequestWithId = Request & { id?: string };

export function isValidCorrelationId(value: string): boolean {
  return value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value);
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: RequestWithId, response: Response, next: NextFunction): void {
    const supplied = request.header(CORRELATION_ID_HEADER);
    const correlationId =
      request.id ??
      (supplied !== undefined && isValidCorrelationId(supplied)
        ? supplied
        : randomUUID());

    request.id = correlationId;
    request.headers[CORRELATION_ID_HEADER] = correlationId;
    response.setHeader(CORRELATION_ID_HEADER, correlationId);
    next();
  }
}
