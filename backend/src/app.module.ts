import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './shared/infrastructure/database/prisma.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { ExtractionModule } from './modules/extraction/extraction.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { AuthModule } from './modules/auth/auth.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
      cache: true,
      expandVariables: true,
    }),
    PrismaModule,
    AuthModule,
    IngestionModule,
    ExtractionModule,
    KnowledgeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
