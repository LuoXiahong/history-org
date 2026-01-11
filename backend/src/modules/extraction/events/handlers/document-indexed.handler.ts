import { EventsHandler, IEventHandler, CommandBus } from '@nestjs/cqrs';
import { Injectable, Logger } from '@nestjs/common';
import { DocumentIndexedEvent } from '../../../ingestion/events/impl/document-indexed.event';
import { FileSystemService } from '../../../../shared/infrastructure/file-system/file-system.service';
import { ExtractEntitiesCommand } from '../../commands/impl/extract-entities.command';

@Injectable()
@EventsHandler(DocumentIndexedEvent)
export class DocumentIndexedHandler implements IEventHandler<DocumentIndexedEvent> {
  private readonly logger = new Logger(DocumentIndexedHandler.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly fileSystem: FileSystemService,
  ) {}

  async handle(event: DocumentIndexedEvent): Promise<void> {
    const { documentId, filePath } = event;

    this.logger.log(
      `DocumentIndexedEvent received for document ${documentId} (${filePath})`,
    );

    try {
      // Read document content
      const content = await this.fileSystem.readFile(filePath);

      // Trigger extraction command
      await this.commandBus.execute(
        new ExtractEntitiesCommand(documentId, content),
      );
    } catch (error) {
      this.logger.error(
        `Failed to trigger extraction for document ${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't throw - event handler failures shouldn't crash the system
    }
  }
}
