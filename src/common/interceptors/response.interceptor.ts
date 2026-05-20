import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiSuccessResponse } from '../responses/api-response.interface';

interface ResponseWithMessage<T> {
  message?: string;
  data?: T;
}

function hasWrappedShape<T>(value: unknown): value is ResponseWithMessage<T> {
  return typeof value === 'object' && value !== null && ('data' in value || 'message' in value);
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((response: T) => {
        if (hasWrappedShape<T>(response)) {
          return {
            success: true,
            message: response.message ?? 'Success',
            data: response.data as T,
          };
        }

        return {
          success: true,
          message: 'Success',
          data: response,
        };
      }),
    );
  }
}
