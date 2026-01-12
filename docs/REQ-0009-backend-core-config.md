# REQ-0009: Backend Core Configuration (Hardening)

| Field | Value |
|-------|-------|
| **Status** | `DRAFT` |
| **Priority** | Critical |
| **Complexity** | Low |
| **Estimated Effort** | 2-3 hours |
| **Dependencies** | None |
| **Affects** | `backend/src/main.ts`, `backend/src/app.module.ts` |

---

## 1. Overview

This requirement addresses critical security and configuration gaps in the NestJS application bootstrap process. The current `main.ts` lacks essential security middleware, proper validation configuration, and API documentation setup.

## 2. Objectives

- Implement security hardening with `helmet` middleware
- Configure explicit CORS policy
- Set up global validation with strict `ValidationPipe` options
- Configure Swagger/OpenAPI documentation properly
- Enable graceful shutdown handling
- Standardize API versioning

## 3. Scope

### In Scope
- Refactoring `main.ts` bootstrap function
- Installing and configuring `helmet`
- Configuring `@nestjs/swagger`
- Setting up global `ValidationPipe`
- Implementing graceful shutdown hooks

### Out of Scope
- Authentication/Authorization (covered in REQ-0010)
- Custom exception filters (covered in REQ-0012)
- Health checks (covered in REQ-0011)
- Rate limiting (covered in REQ-0012)

---

## 4. Technical Specification

### 4.1 Required Dependencies

```bash
npm install helmet @nestjs/swagger swagger-ui-express class-validator class-transformer
npm install -D @types/express
```

### 4.2 Refactored main.ts

**Location:** `backend/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';

  // ============================================
  // Security Middleware
  // ============================================
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: isProduction,
    }),
  );

  // ============================================
  // CORS Configuration
  // ============================================
  const allowedOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:5173');
  
  app.enableCors({
    origin: isProduction 
      ? allowedOrigins.split(',').map((origin) => origin.trim())
      : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    credentials: true,
    maxAge: 3600,
  });

  // ============================================
  // API Versioning
  // ============================================
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ============================================
  // Global Validation Pipe
  // ============================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // Strip properties not in DTO
      forbidNonWhitelisted: true,   // Throw error on extra properties
      transform: true,              // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: isProduction,
      validationError: {
        target: false,              // Don't expose target object in errors
        value: false,               // Don't expose value in errors
      },
    }),
  );

  // ============================================
  // Swagger Documentation (non-production only)
  // ============================================
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('History Org API')
      .setDescription(`
        RESTful API for History Organization application.
        
        ## Authentication
        Most endpoints require JWT authentication. 
        Use the /auth/login endpoint to obtain a token.
        
        ## Rate Limiting
        API requests are rate-limited to prevent abuse.
        See response headers for limit information.
      `)
      .setVersion('1.0')
      .setContact('API Support', 'https://github.com/history-org', 'support@history-org.dev')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addServer('http://localhost:3000', 'Local Development')
      .addServer('https://api.history-org.dev', 'Production')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Knowledge', 'Knowledge base management endpoints')
      .addTag('Documents', 'Document management endpoints')
      .addTag('Events', 'Historical events endpoints')
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Health', 'Health check endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig, {
      operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    });

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'History Org API Documentation',
    });

    logger.log(`📚 Swagger documentation available at http://localhost:${port}/api/docs`);
  }

  // ============================================
  // Graceful Shutdown
  // ============================================
  app.enableShutdownHooks();

  // ============================================
  // Start Server
  // ============================================
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application running on http://localhost:${port}`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
  logger.log(`📡 API prefix: /api/v1`);
}

bootstrap().catch((error) => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});
```

### 4.3 Environment Configuration

**Location:** `backend/.env.example`

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/historyorg?schema=public

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=1d
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

### 4.4 ConfigModule Setup

**Location:** `backend/src/config/configuration.ts`

```typescript
export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-prod',
    expiresIn: process.env.JWT_EXPIRATION || '1d',
  },
  cors: {
    origins: process.env.CORS_ORIGINS || 'http://localhost:5173',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
});
```

### 4.5 Updated AppModule

**Location:** `backend/src/app.module.ts` (partial update)

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
// ... other imports

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
      cache: true,
      expandVariables: true,
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

### 4.6 Validation Decorators Example

**Location:** `backend/src/modules/knowledge/dto/create-knowledge.dto.ts` (example)

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum KnowledgeType {
  ARTICLE = 'ARTICLE',
  NOTE = 'NOTE',
  REFERENCE = 'REFERENCE',
}

export class CreateKnowledgeDto {
  @ApiProperty({
    description: 'Title of the knowledge entry',
    example: 'The French Revolution',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiProperty({
    description: 'Content/body of the knowledge entry',
    example: 'The French Revolution was a period of radical political and societal change...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Type of knowledge entry',
    enum: KnowledgeType,
    default: KnowledgeType.ARTICLE,
  })
  @IsOptional()
  @IsEnum(KnowledgeType)
  type?: KnowledgeType = KnowledgeType.ARTICLE;

  @ApiPropertyOptional({
    description: 'Associated document ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4')
  documentId?: string;
}
```

### 4.7 Controller Swagger Decorators Example

**Location:** Controller example with full Swagger documentation

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { KnowledgeResponseDto } from './dto/knowledge-response.dto';

@ApiTags('Knowledge')
@ApiBearerAuth('JWT-auth')
@Controller('knowledge')
export class KnowledgeController {
  @Post()
  @ApiOperation({
    summary: 'Create knowledge entry',
    description: 'Creates a new knowledge entry in the system',
  })
  @ApiBody({ type: CreateKnowledgeDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Knowledge entry created successfully',
    type: KnowledgeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async create(@Body() dto: CreateKnowledgeDto): Promise<KnowledgeResponseDto> {
    // Implementation
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get knowledge entry by ID',
    description: 'Retrieves a specific knowledge entry by its unique identifier',
  })
  @ApiParam({
    name: 'id',
    description: 'Knowledge entry UUID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Knowledge entry retrieved successfully',
    type: KnowledgeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Knowledge entry not found',
  })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<KnowledgeResponseDto> {
    // Implementation
  }
}
```

---

## 5. Acceptance Criteria

- [ ] `helmet` middleware is applied with appropriate CSP settings
- [ ] CORS is explicitly configured (not using `*` in production)
- [ ] `ValidationPipe` is globally configured with `whitelist: true` and `transform: true`
- [ ] Swagger UI is accessible at `/api/docs` in development mode
- [ ] Swagger is disabled in production (`NODE_ENV=production`)
- [ ] API versioning is enabled with `/api/v1` prefix
- [ ] Graceful shutdown hooks are enabled
- [ ] All existing DTOs have proper validation decorators
- [ ] All controllers have Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`)

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Location:** `backend/src/main.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './app.module';

describe('Application Bootstrap', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Security Headers', () => {
    it('should include security headers from helmet', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('should reject requests with extra properties (forbidNonWhitelisted)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/knowledge')
        .send({
          title: 'Test',
          content: 'Content',
          invalidField: 'should be rejected',
        });

      expect(response.status).toBe(400);
    });

    it('should strip unknown properties (whitelist)', async () => {
      // This depends on forbidNonWhitelisted being false
      // With forbidNonWhitelisted: true, it throws instead
    });
  });

  describe('CORS', () => {
    it('should handle preflight requests', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/v1/knowledge')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});
```

### 6.2 Manual Verification

```bash
# Start the application
npm run start:dev

# Verify Swagger UI
curl -I http://localhost:3000/api/docs

# Verify helmet headers
curl -I http://localhost:3000/api/v1/health

# Test validation (should fail with 400)
curl -X POST http://localhost:3000/api/v1/knowledge \
  -H "Content-Type: application/json" \
  -d '{"invalidField": "test"}'
```

---

## 7. Rollback Plan

1. Revert `main.ts` to previous version
2. Remove `helmet` from dependencies if causing issues
3. Swagger configuration is non-breaking and can be easily removed

---

## 8. Security Considerations

- JWT secret must be stored in environment variables, never hardcoded
- CORS origins should be explicitly listed in production
- Swagger UI must be disabled in production
- Validation errors should not expose internal structure in production
- Content Security Policy should be strict in production

---

## 9. References

- [NestJS Security](https://docs.nestjs.com/security/helmet)
- [NestJS CORS](https://docs.nestjs.com/security/cors)
- [NestJS Validation](https://docs.nestjs.com/techniques/validation)
- [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [Helmet.js](https://helmetjs.github.io/)
