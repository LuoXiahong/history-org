import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { IngestionController } from '../ingestion.controller';
import { FileSystemService } from '../../../shared/infrastructure/file-system/file-system.service';
import { IndexDocumentCommand } from '../commands/impl/index-document.command';

describe('IngestionController', () => {
  let controller: IngestionController;
  let commandBus: CommandBus;
  let fileSystemService: FileSystemService;

  const mockDocumentResponse = {
    id: 'test-uuid',
    filePath: 'uploads/2026-01-11-test.md',
    fileName: 'test.md',
    title: null,
    contentHash: 'abc123',
    lastModified: new Date(),
    indexedAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngestionController],
      providers: [
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn().mockResolvedValue(mockDocumentResponse),
          },
        },
        {
          provide: FileSystemService,
          useValue: {
            writeFile: jest.fn().mockResolvedValue(undefined),
            getBasePath: jest.fn().mockReturnValue('./content'),
          },
        },
      ],
    }).compile();

    controller = module.get<IngestionController>(IngestionController);
    commandBus = module.get<CommandBus>(CommandBus);
    fileSystemService = module.get<FileSystemService>(FileSystemService);
  });

  describe('indexDocument', () => {
    it('should execute IndexDocumentCommand with provided file path', async () => {
      const dto = { filePath: 'documents/history.md' };

      const result = await controller.indexDocument(dto);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new IndexDocumentCommand('documents/history.md'),
      );
      expect(result).toEqual(mockDocumentResponse);
    });
  });

  describe('uploadDocument', () => {
    it('should save file and trigger indexing', async () => {
      const mockFile = {
        originalname: 'test-document.md',
        buffer: Buffer.from('# Test Document\n\nContent here'),
        mimetype: 'text/markdown',
      } as Express.Multer.File;

      const result = await controller.uploadDocument(mockFile);

      expect(fileSystemService.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-document.md'),
        mockFile.buffer,
      );
      expect(commandBus.execute).toHaveBeenCalled();
      expect(result).toEqual(mockDocumentResponse);
    });

    it('should reject non-markdown files', async () => {
      const mockFile = {
        originalname: 'document.txt',
        buffer: Buffer.from('Plain text content'),
        mimetype: 'text/plain',
      } as Express.Multer.File;

      await expect(controller.uploadDocument(mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should sanitize filename', async () => {
      const mockFile = {
        originalname: 'file with spaces & special!chars.md',
        buffer: Buffer.from('# Content'),
        mimetype: 'text/markdown',
      } as Express.Multer.File;

      await controller.uploadDocument(mockFile);

      expect(fileSystemService.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(
          /uploads\/\d{4}-\d{2}-\d{2}-file_with_spaces___special_chars\.md/,
        ),
        mockFile.buffer,
      );
    });

    it('should prefix file path with date', async () => {
      const mockFile = {
        originalname: 'napoleon.md',
        buffer: Buffer.from('# Napoleon'),
        mimetype: 'text/markdown',
      } as Express.Multer.File;

      await controller.uploadDocument(mockFile);

      expect(fileSystemService.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/uploads\/\d{4}-\d{2}-\d{2}-napoleon\.md/),
        mockFile.buffer,
      );
    });

    it('should execute IndexDocumentCommand with saved file path', async () => {
      const mockFile = {
        originalname: 'history.md',
        buffer: Buffer.from('# History'),
        mimetype: 'text/markdown',
      } as Express.Multer.File;

      await controller.uploadDocument(mockFile);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(IndexDocumentCommand),
      );

      const executedCommand = (commandBus.execute as jest.Mock).mock
        .calls[0][0];
      expect(executedCommand.filePath).toMatch(/uploads\/.*history\.md/);
    });
  });
});
