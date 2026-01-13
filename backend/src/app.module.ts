import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { ExtractionModule } from './modules/extraction/extraction.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { PrismaModule } from './shared/infrastructure/database/prisma.module';

import { ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
      cache: true,
      expandVariables: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get('THROTTLE_SHORT_TTL', 1000),
            limit: config.get('THROTTLE_SHORT_LIMIT', 3),
          },
          {
            name: 'medium',
            ttl: config.get('THROTTLE_MEDIUM_TTL', 10000),
            limit: config.get('THROTTLE_MEDIUM_LIMIT', 20),
          },
          {
            name: 'long',
            ttl: config.get('THROTTLE_LONG_TTL', 60000),
            limit: config.get('THROTTLE_LONG_LIMIT', 100),
          },
        ],
      }),
    }),
    PrismaModule,
    AuthModule,
    IngestionModule,
    ExtractionModule,
    KnowledgeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    ThrottlerGuard,
    {
      provide: APP_GUARD,
      useExisting: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
