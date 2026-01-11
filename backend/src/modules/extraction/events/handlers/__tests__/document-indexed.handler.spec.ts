import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, CommandBus } from '@nestjs/cqrs';
import { FileSystemService } from '../../../../../shared/infrastructure/file-system/file-system.service';
import { DocumentIndexedHandler } from '../document-indexed.handler';
import { DocumentIndexedEvent } from '../../../../ingestion/events/impl/document-indexed.event';
import { ExtractEntitiesCommand } from '../../../commands/impl/extract-entities.command';

describe('DocumentIndexedHandler', () => {
  let handler: DocumentIndexedHandler;
  let commandBus: CommandBus;
  let fileSystem: FileSystemService;

  const mockCommandBus = {
    execute: jest.fn(),
  };

  const mockFileSystemService = {
    readFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [
        DocumentIndexedHandler,
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
        {
          provide: FileSystemService,
          useValue: mockFileSystemService,
        },
      ],
    }).compile();

    handler = module.get<DocumentIndexedHandler>(DocumentIndexedHandler);
    commandBus = module.get<CommandBus>(CommandBus);
    fileSystem = module.get<FileSystemService>(FileSystemService);
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

    mockFileSystemService.readFile.mockResolvedValue(content);
    mockCommandBus.execute.mockResolvedValue(undefined);

    const event = new DocumentIndexedEvent(documentId, filePath);
    await handler.handle(event);

    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(filePath);
    expect(mockCommandBus.execute).toHaveBeenCalledWith(
      expect.any(ExtractEntitiesCommand),
    );

    const command = mockCommandBus.execute.mock
      .calls[0][0] as ExtractEntitiesCommand;
    expect(command.documentId).toBe(documentId);
    expect(command.content).toBe(content);
  });

  it('should handle file read errors gracefully', async () => {
    const documentId = 'doc-123';
    const filePath = 'non-existent.md';

    mockFileSystemService.readFile.mockRejectedValue(
      new Error('File not found'),
    );

    const event = new DocumentIndexedEvent(documentId, filePath);

    // Should not throw - handler should catch and log errors
    await expect(handler.handle(event)).resolves.not.toThrow();

    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(filePath);
    expect(mockCommandBus.execute).not.toHaveBeenCalled();
  });

  it('should handle command execution errors gracefully', async () => {
    const documentId = 'doc-123';
    const filePath = 'test-document.md';
    const content = 'Test content';

    mockFileSystemService.readFile.mockResolvedValue(content);
    mockCommandBus.execute.mockRejectedValue(new Error('Command failed'));

    const event = new DocumentIndexedEvent(documentId, filePath);

    // Should not throw - handler should catch and log errors
    await expect(handler.handle(event)).resolves.not.toThrow();

    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(filePath);
    expect(mockCommandBus.execute).toHaveBeenCalled();
  });
});
