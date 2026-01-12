import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, CommandBus } from '@nestjs/cqrs';
import { FileSystemService } from '../../../../../shared/infrastructure/file-system/file-system.service';
import { DocumentIndexedHandler } from '../document-indexed.handler';
import { DocumentIndexedEvent } from '../../../../ingestion/events/impl/document-indexed.event';
import { ExtractEntitiesCommand } from '../../../commands/impl/extract-entities.command';

describe('DocumentIndexedHandler', () => {
  let handler: DocumentIndexedHandler;
  let executeMock: jest.Mock;
  let readFileMock: jest.Mock;

  beforeEach(async () => {
    executeMock = jest.fn();
    readFileMock = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        DocumentIndexedHandler,
        {
          provide: CommandBus,
          useValue: {
            execute: executeMock,
          },
        },
        {
          provide: FileSystemService,
          useValue: {
            readFile: readFileMock,
          },
        },
      ],
    }).compile();

    handler = module.get<DocumentIndexedHandler>(DocumentIndexedHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should trigger extraction command when event is received', async () => {
    const documentId = 'doc-123';
    const filePath = 'test-document.md';
    const content = 'Napoleon Bonaparte was defeated at Waterloo.';

    readFileMock.mockResolvedValue(content);
    executeMock.mockResolvedValue(undefined);

    const event = new DocumentIndexedEvent(documentId, filePath);
    await handler.handle(event);

    expect(readFileMock).toHaveBeenCalledWith(filePath);
    expect(executeMock).toHaveBeenCalledWith(
      expect.any(ExtractEntitiesCommand),
    );

    const execCalls = executeMock.mock.calls as Array<[ExtractEntitiesCommand]>;
    const command = execCalls[0][0];
    expect(command.documentId).toBe(documentId);
    expect(command.content).toBe(content);
  });

  it('should handle file read errors gracefully', async () => {
    const documentId = 'doc-123';
    const filePath = 'non-existent.md';

    readFileMock.mockRejectedValue(new Error('File not found'));

    const event = new DocumentIndexedEvent(documentId, filePath);

    // Should not throw - handler should catch and log errors
    await expect(handler.handle(event)).resolves.not.toThrow();

    expect(readFileMock).toHaveBeenCalledWith(filePath);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('should handle command execution errors gracefully', async () => {
    const documentId = 'doc-123';
    const filePath = 'test-document.md';
    const content = 'Test content';

    readFileMock.mockResolvedValue(content);
    executeMock.mockRejectedValue(new Error('Command failed'));

    const event = new DocumentIndexedEvent(documentId, filePath);

    // Should not throw - handler should catch and log errors
    await expect(handler.handle(event)).resolves.not.toThrow();

    expect(readFileMock).toHaveBeenCalledWith(filePath);
    expect(executeMock).toHaveBeenCalled();
  });
});
