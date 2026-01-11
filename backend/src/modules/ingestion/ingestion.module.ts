import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { IngestionController } from './ingestion.controller';
import { IndexDocumentHandler } from './commands/handlers/index-document.handler';
import { DocumentIndexedHandler } from './events/handlers/document-indexed.handler';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { FileSystemService } from '../../shared/infrastructure/file-system/file-system.service';

const commandHandlers = [IndexDocumentHandler];
const eventHandlers = [DocumentIndexedHandler];

@Module({
  imports: [CqrsModule, ConfigModule],
  controllers: [IngestionController],
  providers: [
    ...commandHandlers,
    ...eventHandlers,
    PrismaService,
    FileSystemService,
  ],
})
export class IngestionModule {}
