import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { IndexDocumentHandler } from './index-document.handler';
import { IndexDocumentCommand } from '../impl/index-document.command';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { FileSystemService } from '../../../../shared/infrastructure/file-system/file-system.service';
import { DocumentIndexedEvent } from '../../events/impl/document-indexed.event';
import { hashContent } from '../../../../shared/utils/hash.util';

describe('IndexDocumentHandler', () => {
  let handler: IndexDocumentHandler;
  let prismaService: {
    document: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let fileSystemService: {
    exists: jest.Mock;
    readFile: jest.Mock;
    getFileStats: jest.Mock;
  };
  let eventBus: {
    publish: jest.Mock;
  };

  const mockDocument = {
    id: 'test-id',
    filePath: 'test.md',
    fileName: 'test.md',
    title: null,
    contentHash: 'hash123',
    lastModified: new Date('2024-01-01'),
    indexedAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      document: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockFileSystemService = {
      exists: jest.fn(),
      readFile: jest.fn(),
      getFileStats: jest.fn(),
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndexDocumentHandler,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FileSystemService,
          useValue: mockFileSystemService,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    handler = module.get<IndexDocumentHandler>(IndexDocumentHandler);
    prismaService = module.get(PrismaService);
    fileSystemService = module.get(FileSystemService);
    eventBus = module.get(EventBus);
  });

  it('should create a new document when file does not exist in database', async () => {
    const filePath = 'new-document.md';
    const content = '# Test Document\n\nContent here.';
    const contentHash = hashContent(content);
    const stats = {
      size: 100,
      mtime: new Date('2024-01-02'),
    };

    fileSystemService.exists.mockResolvedValue(true);
    fileSystemService.readFile.mockResolvedValue(content);
    fileSystemService.getFileStats.mockResolvedValue(stats);
    prismaService.document.findUnique.mockResolvedValue(null);
    prismaService.document.create.mockResolvedValue({
      ...mockDocument,
      filePath,
      fileName: 'new-document.md',
      contentHash,
      lastModified: stats.mtime,
    });

    const command = new IndexDocumentCommand(filePath);
    const result = await handler.execute(command);

    expect(fileSystemService.exists).toHaveBeenCalledWith(filePath);
    expect(fileSystemService.readFile).toHaveBeenCalledWith(filePath);
    expect(fileSystemService.getFileStats).toHaveBeenCalledWith(filePath);
    expect(prismaService.document.findUnique).toHaveBeenCalledWith({
      where: { filePath },
    });
    expect(prismaService.document.create).toHaveBeenCalledWith({
      data: {
        filePath,
        fileName: 'new-document.md',
        contentHash,
        lastModified: stats.mtime,
      },
    });
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.any(DocumentIndexedEvent),
    );
    expect(result.filePath).toBe(filePath);
    expect(result.contentHash).toBe(contentHash);
  });

  it('should update document when file exists but content hash changed', async () => {
    const filePath = 'existing-document.md';
    const newContent = '# Updated Document\n\nNew content.';
    const newContentHash = hashContent(newContent);
    const stats = {
      size: 150,
      mtime: new Date('2024-01-03'),
    };

    const existingDocument = {
      ...mockDocument,
      filePath,
      contentHash: 'old-hash',
    };

    fileSystemService.exists.mockResolvedValue(true);
    fileSystemService.readFile.mockResolvedValue(newContent);
    fileSystemService.getFileStats.mockResolvedValue(stats);
    prismaService.document.findUnique.mockResolvedValue(existingDocument);
    prismaService.document.update.mockResolvedValue({
      ...existingDocument,
      contentHash: newContentHash,
      lastModified: stats.mtime,
      fileName: 'existing-document.md',
    });

    const command = new IndexDocumentCommand(filePath);
    const result = await handler.execute(command);

    expect(prismaService.document.update).toHaveBeenCalledWith({
      where: { id: existingDocument.id },
      data: {
        fileName: 'existing-document.md',
        contentHash: newContentHash,
        lastModified: stats.mtime,
      },
    });
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.any(DocumentIndexedEvent),
    );
    expect(result.contentHash).toBe(newContentHash);
  });

  it('should return existing document when content hash unchanged', async () => {
    const filePath = 'unchanged-document.md';
    const content = '# Unchanged Document';
    const contentHash = hashContent(content);

    const existingDocument = {
      ...mockDocument,
      filePath,
      contentHash,
    };

    fileSystemService.exists.mockResolvedValue(true);
    fileSystemService.readFile.mockResolvedValue(content);
    prismaService.document.findUnique.mockResolvedValue(existingDocument);

    const command = new IndexDocumentCommand(filePath);
    const result = await handler.execute(command);

    expect(prismaService.document.findUnique).toHaveBeenCalledWith({
      where: { filePath },
    });
    expect(prismaService.document.create).not.toHaveBeenCalled();
    expect(prismaService.document.update).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
    expect(result).toEqual(existingDocument);
  });

  it('should throw NotFoundException when file does not exist', async () => {
    const filePath = 'non-existent.md';

    fileSystemService.exists.mockResolvedValue(false);

    const command = new IndexDocumentCommand(filePath);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(command)).rejects.toThrow(
      `File not found: ${filePath}`,
    );
    expect(fileSystemService.readFile).not.toHaveBeenCalled();
    expect(prismaService.document.findUnique).not.toHaveBeenCalled();
  });
});
