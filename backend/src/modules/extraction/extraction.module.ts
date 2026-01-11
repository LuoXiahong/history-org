import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { FileSystemService } from '../../shared/infrastructure/file-system/file-system.service';
import { OpenAIExtractorService } from './domain/openai-extractor.service';
import { ExtractEntitiesHandler } from './commands/handlers/extract-entities.handler';
import { DocumentIndexedHandler } from './events/handlers/document-indexed.handler';

const commandHandlers = [ExtractEntitiesHandler];
const eventHandlers = [DocumentIndexedHandler];

@Module({
  imports: [CqrsModule, ConfigModule],
  providers: [
    ...commandHandlers,
    ...eventHandlers,
    OpenAIExtractorService,
    PrismaService,
    FileSystemService,
  ],
})
export class ExtractionModule {}
