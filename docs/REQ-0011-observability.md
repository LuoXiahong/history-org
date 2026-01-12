# REQ-0011: Observability & Health

| Field | Value |
|-------|-------|
| **Status** | `DRAFT` |
| **Priority** | High |
| **Complexity** | Medium |
| **Estimated Effort** | 4-6 hours |
| **Dependencies** | None |
| **Affects** | `AppModule`, new `HealthModule`, logging infrastructure |

---

## 1. Overview

This requirement implements comprehensive observability features including health checks, structured logging, and optional metrics collection. These capabilities are essential for production monitoring, debugging, and maintaining system reliability.

## 2. Objectives

- Implement health check endpoints using `@nestjs/terminus`
- Replace default logger with structured logging (`nestjs-pino`)
- Add Prometheus metrics endpoint for monitoring
- Enable request tracing with correlation IDs
- Configure log levels per environment

## 3. Scope

### In Scope
- `HealthModule` with database and memory health checks
- Structured JSON logging with `nestjs-pino`
- Request/response logging with correlation IDs
- Prometheus metrics endpoint (`/metrics`)
- Health check endpoint (`/health`)
- Liveness and readiness probes (`/health/live`, `/health/ready`)

### Out of Scope
- APM integration (Datadog, New Relic)
- Distributed tracing (Jaeger, Zipkin)
- Log aggregation setup (ELK, Loki)
- Custom business metrics
- Alerting configuration

---

## 4. Technical Specification

### 4.1 Required Dependencies

```bash
npm install @nestjs/terminus @godaddy/terminus
npm install nestjs-pino pino pino-http pino-pretty
npm install prom-client @willsoto/nestjs-prometheus
npm install uuid
npm install -D @types/uuid
```

### 4.2 Module Structure

```
backend/src/modules/health/
├── health.module.ts
├── health.controller.ts
├── indicators/
│   ├── database.health.ts
│   └── memory.health.ts
└── __tests__/
    └── health.controller.spec.ts

backend/src/shared/infrastructure/logging/
├── logging.module.ts
├── logger.config.ts
└── correlation-id.middleware.ts

backend/src/shared/infrastructure/metrics/
├── metrics.module.ts
└── metrics.controller.ts
```

### 4.3 Health Module

**Location:** `backend/src/modules/health/health.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { MemoryHealthIndicator } from './indicators/memory.health';
import { PrismaModule } from '../../shared/infrastructure/database/prisma.module';

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator, MemoryHealthIndicator],
})
export class HealthModule {}
```

### 4.4 Health Controller

**Location:** `backend/src/modules/health/health.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../auth/decorators/public.decorator';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { MemoryHealthIndicator as CustomMemoryIndicator } from './indicators/memory.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
    private readonly memory: CustomMemoryIndicator,
    private readonly memoryHealth: MemoryHealthIndicator,
    private readonly diskHealth: DiskHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Full health check',
    description: 'Performs comprehensive health check of all system components',
  })
  @ApiResponse({
    status: 200,
    description: 'System is healthy',
    schema: {
      example: {
        status: 'ok',
        info: {
          database: { status: 'up' },
          memory: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          memory: { status: 'up' },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'System is unhealthy',
  })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.memory.isHealthy('memory'),
      () =>
        this.memoryHealth.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB
      () =>
        this.memoryHealth.checkRSS('memory_rss', 500 * 1024 * 1024), // 500MB
    ]);
  }

  @Public()
  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Simple check to verify the application is running',
  })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  async liveness(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Checks if the application is ready to receive traffic',
  })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  async readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.isHealthy('database'),
    ]);
  }
}
```

### 4.5 Database Health Indicator

**Location:** `backend/src/modules/health/indicators/database.health.ts`

```typescript
import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      
      return this.getStatus(key, true, {
        responseTime: 'ok',
      });
    } catch (error) {
      throw new HealthCheckError(
        'Database health check failed',
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }
}
```

### 4.6 Memory Health Indicator

**Location:** `backend/src/modules/health/indicators/memory.health.ts`

```typescript
import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';

@Injectable()
export class MemoryHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);

    const isHealthy = heapUsedMB < 300; // Alert if heap > 300MB

    const result = this.getStatus(key, isHealthy, {
      heapUsed: `${heapUsedMB}MB`,
      heapTotal: `${heapTotalMB}MB`,
      rss: `${rssMB}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
    });

    if (!isHealthy) {
      throw new HealthCheckError('Memory usage too high', result);
    }

    return result;
  }
}
```

### 4.7 Logging Module

**Location:** `backend/src/shared/infrastructure/logging/logging.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';

        return {
          pinoHttp: {
            // Generate correlation ID for each request
            genReqId: (req: Request) => {
              return (
                (req.headers['x-correlation-id'] as string) ||
                (req.headers['x-request-id'] as string) ||
                uuidv4()
              );
            },

            // Log level based on environment
            level: isProduction ? 'info' : 'debug',

            // Redact sensitive fields
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.token',
                'res.headers["set-cookie"]',
              ],
              censor: '[REDACTED]',
            },

            // Custom log serializers
            serializers: {
              req: (req: Request) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                query: req.query,
                params: req.params,
                headers: {
                  host: req.headers.host,
                  'user-agent': req.headers['user-agent'],
                  'content-type': req.headers['content-type'],
                },
              }),
              res: (res) => ({
                statusCode: res.statusCode,
              }),
            },

            // Pretty print in development
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                    singleLine: false,
                  },
                },

            // Custom log messages
            customLogLevel: (req, res, err) => {
              if (res.statusCode >= 500 || err) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },

            customSuccessMessage: (req, res) => {
              return `${req.method} ${req.url} completed`;
            },

            customErrorMessage: (req, res, err) => {
              return `${req.method} ${req.url} failed: ${err?.message || 'Unknown error'}`;
            },

            // Auto-logging configuration
            autoLogging: {
              ignore: (req: Request) => {
                // Don't log health check requests
                return (
                  req.url?.includes('/health') ||
                  req.url?.includes('/metrics')
                );
              },
            },
          },
        };
      },
    }),
  ],
  exports: [LoggerModule],
})
export class LoggingModule {}
```

### 4.8 Correlation ID Middleware

**Location:** `backend/src/shared/infrastructure/logging/correlation-id.middleware.ts`

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      uuidv4();

    req.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);

    next();
  }
}
```

### 4.9 Metrics Module

**Location:** `backend/src/shared/infrastructure/metrics/metrics.module.ts`

```typescript
import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'historyorg_',
        },
      },
    }),
  ],
  controllers: [MetricsController],
  providers: [
    // HTTP request counter
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
    }),

    // HTTP request duration histogram
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    }),

    // Active connections gauge
    makeGaugeProvider({
      name: 'active_connections',
      help: 'Number of active connections',
    }),

    // Database query counter
    makeCounterProvider({
      name: 'database_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'table'],
    }),

    // Database query duration histogram
    makeHistogramProvider({
      name: 'database_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    }),
  ],
  exports: [PrometheusModule],
})
export class MetricsModule {}
```

### 4.10 Metrics Controller

**Location:** `backend/src/shared/infrastructure/metrics/metrics.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '../../../modules/auth/decorators/public.decorator';

@ApiTags('Metrics')
@Controller()
export class MetricsController {
  @Public()
  @Get('metrics')
  @ApiExcludeEndpoint() // Hide from Swagger as it's handled by Prometheus module
  async getMetrics(): Promise<void> {
    // Metrics are handled by PrometheusModule
    // This controller exists for documentation purposes
  }
}
```

### 4.11 Metrics Interceptor

**Location:** `backend/src/shared/infrastructure/metrics/metrics.interceptor.ts`

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import { Request, Response } from 'express';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly httpRequestsCounter: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly httpRequestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.recordMetrics(request, response, startTime);
        },
        error: () => {
          this.recordMetrics(request, response, startTime);
        },
      }),
    );
  }

  private recordMetrics(
    request: Request,
    response: Response,
    startTime: number,
  ): void {
    const duration = (Date.now() - startTime) / 1000;
    const path = this.normalizePath(request.route?.path || request.path);
    const method = request.method;
    const status = response.statusCode.toString();

    this.httpRequestsCounter.inc({ method, path, status });
    this.httpRequestDuration.observe({ method, path, status }, duration);
  }

  private normalizePath(path: string): string {
    // Replace UUIDs and numeric IDs with placeholders
    return path
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ':id',
      )
      .replace(/\/\d+/g, '/:id');
  }
}
```

### 4.12 Updated AppModule

**Location:** `backend/src/app.module.ts` (additions)

```typescript
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HealthModule } from './modules/health/health.module';
import { LoggingModule } from './shared/infrastructure/logging/logging.module';
import { MetricsModule } from './shared/infrastructure/metrics/metrics.module';
import { CorrelationIdMiddleware } from './shared/infrastructure/logging/correlation-id.middleware';
import { MetricsInterceptor } from './shared/infrastructure/metrics/metrics.interceptor';

@Module({
  imports: [
    // ... existing imports
    LoggingModule,
    HealthModule,
    MetricsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
```

---

## 5. Acceptance Criteria

- [ ] `/health` endpoint returns comprehensive system health status
- [ ] `/health/live` returns simple liveness check (for k8s probes)
- [ ] `/health/ready` checks database connectivity (for k8s probes)
- [ ] Health check returns 503 when database is unavailable
- [ ] All requests include `X-Correlation-Id` header in response
- [ ] Logs are structured JSON in production
- [ ] Logs are pretty-printed in development
- [ ] Sensitive data is redacted from logs
- [ ] `/metrics` endpoint returns Prometheus-compatible metrics
- [ ] HTTP request count and duration are tracked
- [ ] Memory and CPU metrics are exposed

---

## 6. Testing Strategy

### 6.1 Unit Tests

```typescript
describe('HealthController', () => {
  describe('GET /health', () => {
    it('should return healthy status when all checks pass', async () => {});
    it('should return unhealthy status when database is down', async () => {});
  });

  describe('GET /health/live', () => {
    it('should always return ok status', async () => {});
  });

  describe('GET /health/ready', () => {
    it('should return ok when database is connected', async () => {});
    it('should return 503 when database is disconnected', async () => {});
  });
});

describe('DatabaseHealthIndicator', () => {
  it('should return healthy when database query succeeds', async () => {});
  it('should throw HealthCheckError when database query fails', async () => {});
});
```

### 6.2 E2E Tests

```typescript
describe('Observability (e2e)', () => {
  describe('Health Checks', () => {
    it('GET /health should return 200', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.info.database).toBeDefined();
    });

    it('GET /health/live should return 200', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  describe('Metrics', () => {
    it('GET /metrics should return Prometheus metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('historyorg_');
      expect(response.text).toContain('http_requests_total');
    });
  });

  describe('Correlation ID', () => {
    it('should include X-Correlation-Id in response headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/live');

      expect(response.headers['x-correlation-id']).toBeDefined();
    });

    it('should use provided X-Correlation-Id from request', async () => {
      const correlationId = 'test-correlation-id-123';
      
      const response = await request(app.getHttpServer())
        .get('/health/live')
        .set('X-Correlation-Id', correlationId);

      expect(response.headers['x-correlation-id']).toBe(correlationId);
    });
  });
});
```

---

## 7. Configuration Options

### Environment Variables

```env
# Logging
LOG_LEVEL=info                 # debug, info, warn, error
LOG_PRETTY=false               # Enable pretty printing (dev only)

# Metrics
METRICS_ENABLED=true           # Enable/disable metrics endpoint
METRICS_PREFIX=historyorg_     # Prefix for all metrics

# Health Check Thresholds
HEALTH_HEAP_THRESHOLD=300      # Heap memory threshold in MB
HEALTH_RSS_THRESHOLD=500       # RSS memory threshold in MB
```

---

## 8. References

- [NestJS Terminus](https://docs.nestjs.com/recipes/terminus)
- [nestjs-pino](https://github.com/iamolegga/nestjs-pino)
- [Pino Logger](https://github.com/pinojs/pino)
- [Prometheus Node.js Client](https://github.com/siimon/prom-client)
- [willsoto/nestjs-prometheus](https://github.com/willsoto/nestjs-prometheus)
- [Kubernetes Health Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
