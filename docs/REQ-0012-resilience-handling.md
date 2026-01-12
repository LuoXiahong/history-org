# REQ-0012: Resilience & Error Handling

| Field | Value |
|-------|-------|
| **Status** | `DRAFT` |
| **Priority** | High |
| **Complexity** | Medium |
| **Estimated Effort** | 4-6 hours |
| **Dependencies** | REQ-0011 (Observability - for logging) |
| **Affects** | `AppModule`, global filters and interceptors |

---

## 1. Overview

This requirement implements resilience patterns and standardized error handling across the application. It includes global exception filters, rate limiting, and custom domain exceptions to ensure consistent API responses and protection against abuse.

## 2. Objectives

- Implement global exception filter for standardized error responses
- Add rate limiting with `@nestjs/throttler`
- Create custom domain exception hierarchy
- Ensure all errors are logged with context
- Provide consistent error response format across all endpoints

## 3. Scope

### In Scope
- `AllExceptionsFilter` for global error handling
- `@nestjs/throttler` configuration and integration
- Custom domain exception classes
- Standardized error response DTOs
- Request timeout handling

### Out of Scope
- Circuit breaker pattern (future requirement)
- Retry mechanisms for external services
- Bulkhead pattern
- Custom rate limiting per user/IP tier

---

## 4. Technical Specification

### 4.1 Required Dependencies

```bash
npm install @nestjs/throttler
```

### 4.2 Module Structure

```
backend/src/shared/
├── exceptions/
│   ├── domain.exception.ts
│   ├── not-found.exception.ts
│   ├── validation.exception.ts
│   └── business-rule.exception.ts
├── filters/
│   ├── all-exceptions.filter.ts
│   └── __tests__/
│       └── all-exceptions.filter.spec.ts
└── dto/
    └── error-response.dto.ts
```

### 4.3 Error Response DTO

**Location:** `backend/src/shared/dto/error-response.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error code for client handling',
    example: 'VALIDATION_ERROR',
  })
  error: string;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Validation failed',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Detailed validation errors',
    example: [
      { field: 'email', message: 'Invalid email format' },
    ],
  })
  details?: Array<{ field: string; message: string }>;

  @ApiProperty({
    description: 'ISO timestamp of the error',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path',
    example: '/api/v1/knowledge',
  })
  path: string;

  @ApiPropertyOptional({
    description: 'Correlation ID for request tracing',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  correlationId?: string;
}
```

### 4.4 Domain Exceptions

**Location:** `backend/src/shared/exceptions/domain.exception.ts`

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

export interface DomainExceptionOptions {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export abstract class DomainException extends HttpException {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    options: DomainExceptionOptions,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        code: options.code,
        message: options.message,
        details: options.details,
      },
      status,
    );
    this.code = options.code;
    this.details = options.details;
  }
}
```

**Location:** `backend/src/shared/exceptions/not-found.exception.ts`

```typescript
import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

export class EntityNotFoundException extends DomainException {
  constructor(entityName: string, identifier: string | number) {
    super(
      {
        code: 'ENTITY_NOT_FOUND',
        message: `${entityName} with identifier '${identifier}' was not found`,
        details: { entity: entityName, identifier },
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
```

**Location:** `backend/src/shared/exceptions/validation.exception.ts`

```typescript
import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export class DomainValidationException extends DomainException {
  public readonly errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    super(
      {
        code: 'VALIDATION_ERROR',
        message: 'One or more validation errors occurred',
        details: { errors },
      },
      HttpStatus.BAD_REQUEST,
    );
    this.errors = errors;
  }

  static fromField(field: string, message: string): DomainValidationException {
    return new DomainValidationException([{ field, message }]);
  }
}
```

**Location:** `backend/src/shared/exceptions/business-rule.exception.ts`

```typescript
import { HttpStatus } from '@nestjs/common';
import { DomainException } from './domain.exception';

export class BusinessRuleException extends DomainException {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super({ code, message, details }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

// Specific business rule exceptions
export class DuplicateEntityException extends BusinessRuleException {
  constructor(entityName: string, field: string, value: string) {
    super(
      'DUPLICATE_ENTITY',
      `${entityName} with ${field} '${value}' already exists`,
      { entity: entityName, field, value },
    );
  }
}

export class InsufficientPermissionsException extends BusinessRuleException {
  constructor(action: string, resource: string) {
    super(
      'INSUFFICIENT_PERMISSIONS',
      `You do not have permission to ${action} this ${resource}`,
      { action, resource },
    );
  }
}

export class InvalidStateException extends BusinessRuleException {
  constructor(message: string, currentState?: string, expectedState?: string) {
    super('INVALID_STATE', message, { currentState, expectedState });
  }
}
```

### 4.5 All Exceptions Filter

**Location:** `backend/src/shared/filters/all-exceptions.filter.ts`

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from '../exceptions/domain.exception';
import { ErrorResponseDto } from '../dto/error-response.dto';

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
      if (status === HttpStatus.TOO_MANY_REQUESTS) {
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

  private isValidationPipeError(response: unknown): response is ValidationPipeError {
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
      const [field, ...rest] = msg.split(' ');
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
      userId: (request as any).user?.id,
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
```

### 4.6 Throttler Configuration

**Location:** `backend/src/app.module.ts` (additions)

```typescript
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';

@Module({
  imports: [
    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: config.get('THROTTLE_SHORT_TTL', 1000),  // 1 second
            limit: config.get('THROTTLE_SHORT_LIMIT', 3), // 3 requests
          },
          {
            name: 'medium',
            ttl: config.get('THROTTLE_MEDIUM_TTL', 10000), // 10 seconds
            limit: config.get('THROTTLE_MEDIUM_LIMIT', 20), // 20 requests
          },
          {
            name: 'long',
            ttl: config.get('THROTTLE_LONG_TTL', 60000),  // 1 minute
            limit: config.get('THROTTLE_LONG_LIMIT', 100), // 100 requests
          },
        ],
      }),
    }),
    // ... other imports
  ],
  providers: [
    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

### 4.7 Custom Throttler Decorator

**Location:** `backend/src/shared/decorators/throttle.decorator.ts`

```typescript
import { Throttle, SkipThrottle } from '@nestjs/throttler';

/**
 * Skip rate limiting for this route
 */
export const NoRateLimit = () => SkipThrottle();

/**
 * Apply strict rate limiting (3 requests per second)
 */
export const StrictRateLimit = () =>
  Throttle({ short: { limit: 3, ttl: 1000 } });

/**
 * Apply auth-specific rate limiting (5 attempts per minute)
 */
export const AuthRateLimit = () =>
  Throttle({ long: { limit: 5, ttl: 60000 } });

/**
 * Apply relaxed rate limiting for read operations
 */
export const RelaxedRateLimit = () =>
  Throttle({ medium: { limit: 50, ttl: 10000 } });
```

### 4.8 Timeout Interceptor

**Location:** `backend/src/shared/interceptors/timeout.interceptor.ts`

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly timeoutMs: number;

  constructor(timeoutMs = 30000) {
    this.timeoutMs = timeoutMs;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () => new RequestTimeoutException('Request timeout'),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
```

---

## 5. Acceptance Criteria

- [ ] All exceptions return standardized `ErrorResponseDto` format
- [ ] Domain exceptions include proper error codes
- [ ] Validation errors include field-level details
- [ ] Rate limiting is enforced globally (100 req/min default)
- [ ] Rate limit exceeded returns 429 with proper message
- [ ] 500 errors are logged with stack trace
- [ ] 4xx errors are logged as warnings
- [ ] Health and metrics endpoints bypass rate limiting
- [ ] Correlation ID is included in all error responses
- [ ] Production mode hides internal error details

---

## 6. Testing Strategy

### 6.1 Unit Tests

```typescript
describe('AllExceptionsFilter', () => {
  describe('Domain Exceptions', () => {
    it('should format EntityNotFoundException correctly', () => {});
    it('should format DomainValidationException with field errors', () => {});
    it('should format BusinessRuleException correctly', () => {});
  });

  describe('HTTP Exceptions', () => {
    it('should handle ValidationPipe errors', () => {});
    it('should handle NotFoundException', () => {});
    it('should handle UnauthorizedException', () => {});
  });

  describe('Unknown Exceptions', () => {
    it('should hide error details in production', () => {});
    it('should show error details in development', () => {});
  });

  describe('Logging', () => {
    it('should log 5xx errors as error level', () => {});
    it('should log 4xx errors as warn level', () => {});
  });
});
```

### 6.2 E2E Tests

```typescript
describe('Resilience (e2e)', () => {
  describe('Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .get('/api/v1/health')
          .expect(200);
      }
    });

    it('should return 429 when limit exceeded', async () => {
      // Make requests until limit is exceeded
      for (let i = 0; i < 150; i++) {
        await request(app.getHttpServer()).get('/api/v1/knowledge');
      }

      const response = await request(app.getHttpServer())
        .get('/api/v1/knowledge')
        .expect(429);

      expect(response.body.error).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Error Handling', () => {
    it('should return standardized error format for 404', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/knowledge/non-existent-id')
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(String),
        path: expect.any(String),
      });
    });

    it('should include correlation ID in error response', async () => {
      const correlationId = 'test-123';
      
      const response = await request(app.getHttpServer())
        .get('/api/v1/knowledge/invalid')
        .set('X-Correlation-Id', correlationId)
        .expect(404);

      expect(response.body.correlationId).toBe(correlationId);
    });
  });
});
```

---

## 7. Configuration

### Environment Variables

```env
# Rate Limiting
THROTTLE_SHORT_TTL=1000      # 1 second window
THROTTLE_SHORT_LIMIT=3       # 3 requests per second
THROTTLE_MEDIUM_TTL=10000    # 10 second window
THROTTLE_MEDIUM_LIMIT=20     # 20 requests per 10 seconds
THROTTLE_LONG_TTL=60000      # 1 minute window
THROTTLE_LONG_LIMIT=100      # 100 requests per minute

# Timeout
REQUEST_TIMEOUT_MS=30000     # 30 second timeout
```

---

## 8. References

- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
- [NestJS Rate Limiting](https://docs.nestjs.com/security/rate-limiting)
- [NestJS Throttler](https://github.com/nestjs/throttler)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
