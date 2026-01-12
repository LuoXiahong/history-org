import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3000);
  const nodeEnv = configService.get<string>('nodeEnv', 'development');
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
  // Cookie Parser
  // ============================================
  app.use(cookieParser());

  // ============================================
  // CORS Configuration
  // ============================================
  const allowedOrigins = configService.get<string>(
    'cors.origins',
    'http://localhost:5173',
  );

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
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error on extra properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: isProduction,
      validationError: {
        target: false, // Don't expose target object in errors
        value: false, // Don't expose value in errors
      },
    }),
  );

  // ============================================
  // Swagger Documentation (non-production only)
  // ============================================
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('History Org API')
      .setDescription(
        `RESTful API for History Organization application.
        
        ## Authentication
        Most endpoints require JWT authentication. 
        Use the /auth/login endpoint to obtain a token.
        
        ## Rate Limiting
        API requests are rate-limited to prevent abuse.
        See response headers for limit information.`,
      )
      .setVersion('1.0')
      .setContact(
        'API Support',
        'https://github.com/history-org',
        'support@history-org.dev',
      )
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
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        methodKey,
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

    logger.log(
      `📚 Swagger documentation available at http://localhost:${port}/api/docs`,
    );
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
