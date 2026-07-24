import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiErrorResponse } from '../responses/api-response.interface';

interface NestExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  errors?: Record<string, unknown>;
  data?: unknown;
}

function normalizeError(exception: unknown): {
  status: number;
  message: string;
  errors: Record<string, unknown>;
  data?: unknown;
} {
  if (exception instanceof HttpException) {
    const response = exception.getResponse();
    const status = exception.getStatus();

    if (typeof response === 'string') {
      return { status, message: response, errors: {} };
    }

    const body = response as NestExceptionResponse;
    return {
      status,
      message: Array.isArray(body.message) ? 'Validation failed' : (body.message ?? 'Error'),
      errors: Array.isArray(body.message) ? { fields: body.message } : (body.errors ?? {}),
      data: body.data,
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
    errors: {},
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const normalized = normalizeError(exception);
    const payload: ApiErrorResponse = {
      success: false,
      message: normalized.message,
      errors: normalized.errors,
    };
    if (normalized.data !== undefined) {
      payload.data = normalized.data;
    }

    response.status(normalized.status).json(payload);
  }
}
