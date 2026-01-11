import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { DocumentIndexedEvent } from '../impl/document-indexed.event';

@Injectable()
@EventsHandler(DocumentIndexedEvent)
export class DocumentIndexedHandler implements IEventHandler<DocumentIndexedEvent> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handle(_event: DocumentIndexedEvent): void {
    // Event handler for DocumentIndexedEvent
    // This can be used to trigger extraction module in the future
    // For now, this is a placeholder for future extraction module integration
  }
}
