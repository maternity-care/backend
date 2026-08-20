import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ApiErrorResponse } from '../responses/api-response.interface';
import { RESPONSE_MESSAGES } from '../constants/response-message.constant';

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
      const message =
        status === HttpStatus.NOT_FOUND && /^Cannot\s+\w+\s+/i.test(response)
          ? RESPONSE_MESSAGES.API_ROUTE_NOT_FOUND
          : response;
      return { status, message, errors: {} };
    }

    const body = response as NestExceptionResponse;
    const rawMessage = Array.isArray(body.message)
      ? null
      : (body.message ?? RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR);
    const message =
      status === HttpStatus.NOT_FOUND &&
      typeof rawMessage === 'string' &&
      /^Cannot\s+\w+\s+/i.test(rawMessage)
        ? RESPONSE_MESSAGES.API_ROUTE_NOT_FOUND
        : rawMessage;
    return {
      status,
      message: Array.isArray(body.message)
        ? RESPONSE_MESSAGES.API_VALIDATION_FAILED
        : (message ?? RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR),
      errors: Array.isArray(body.message) ? { fields: body.message } : (body.errors ?? {}),
      data: body.data,
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: RESPONSE_MESSAGES.INTERNAL_SERVER_ERROR,
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
