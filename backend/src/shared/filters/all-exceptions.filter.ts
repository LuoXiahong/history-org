import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { DomainException } from '../exceptions/domain.exception';

interface ValidationPipeError {
  statusCode: number;
  message: string[] | string;
  error: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);
    this.logException(exception, errorResponse, request);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponseDto {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const correlationId = request.headers['x-correlation-id'] as string;

    // Handle Domain Exceptions
    if (exception instanceof DomainException) {
      return {
        statusCode: exception.getStatus(),
        error: exception.code,
        message: exception.message,
        details: this.formatDetails(exception.details),
        timestamp,
        path,
        correlationId,
      };
    }

    // Handle HTTP Exceptions (including ValidationPipe errors)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Handle class-validator errors
      if (this.isValidationPipeError(exceptionResponse)) {
        return {
          statusCode: status,
          error: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: this.formatValidationErrors(exceptionResponse.message),
          timestamp,
          path,
          correlationId,
        };
      }

      // Handle Throttler errors
      if (status === 429) {
        return {
          statusCode: status,
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          timestamp,
          path,
          correlationId,
        };
      }

      return {
        statusCode: status,
        error: this.getErrorCode(status),
        message: this.getExceptionMessage(exceptionResponse),
        timestamp,
        path,
        correlationId,
      };
    }

    // Handle unknown errors
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_SERVER_ERROR',
      message: isProduction
        ? 'An unexpected error occurred'
        : exception instanceof Error
          ? exception.message
          : 'Unknown error',
      timestamp,
      path,
      correlationId,
    };
  }

  private isValidationPipeError(
    response: unknown,
  ): response is ValidationPipeError {
    return (
      typeof response === 'object' &&
      response !== null &&
      'message' in response &&
      Array.isArray((response as ValidationPipeError).message)
    );
  }

  private formatValidationErrors(
    messages: string[] | string,
  ): Array<{ field: string; message: string }> {
    if (typeof messages === 'string') {
      return [{ field: 'unknown', message: messages }];
    }

    return messages.map((msg) => {
      const parts = msg.split(' ');
      const field = parts[0];
      return {
        field: field?.toLowerCase() || 'unknown',
        message: msg,
      };
    });
  }

  private formatDetails(
    details?: Record<string, unknown>,
  ): Array<{ field: string; message: string }> | undefined {
    if (!details) return undefined;

    if (details.errors && Array.isArray(details.errors)) {
      return details.errors as Array<{ field: string; message: string }>;
    }

    return Object.entries(details).map(([field, value]) => ({
      field,
      message: String(value),
    }));
  }

  private getExceptionMessage(response: unknown): string {
    if (typeof response === 'string') return response;
    if (typeof response === 'object' && response !== null) {
      return (response as { message?: string }).message || 'An error occurred';
    }
    return 'An error occurred';
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return codes[status] || 'UNKNOWN_ERROR';
  }

  private logException(
    exception: unknown,
    errorResponse: ErrorResponseDto,
    request: Request,
  ): void {
    const logContext = {
      correlationId: errorResponse.correlationId,
      path: errorResponse.path,
      method: request.method,
      statusCode: errorResponse.statusCode,
      error: errorResponse.error,
      userId: (request as Request & { user?: { id?: string } }).user?.id,
    };

    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        errorResponse.message,
        exception instanceof Error ? exception.stack : undefined,
        logContext,
      );
    } else if (errorResponse.statusCode >= 400) {
      this.logger.warn(errorResponse.message, logContext);
    }
  }
}
