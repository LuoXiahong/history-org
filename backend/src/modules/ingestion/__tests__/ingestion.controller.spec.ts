import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { IngestionController } from '../ingestion.controller';
import { FileSystemService } from '../../../shared/infrastructure/file-system/file-system.service';
import { IndexDocumentCommand } from '../commands/impl/index-document.command';

describe('IngestionController', () => {
  let controller: IngestionController;
  let executeMock: jest.Mock;
  let writeFileMock: jest.Mock;
  let getBasePathMock: jest.Mock;

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
    executeMock = jest.fn().mockResolvedValue(mockDocumentResponse);
    writeFileMock = jest.fn().mockResolvedValue(undefined);
    getBasePathMock = jest.fn().mockReturnValue('./content');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngestionController],
      providers: [
        {
          provide: CommandBus,
          useValue: {
            execute: executeMock,
          },
        },
        {
          provide: FileSystemService,
          useValue: {
            writeFile: writeFileMock,
            getBasePath: getBasePathMock,
          },
        },
      ],
    }).compile();

    controller = module.get<IngestionController>(IngestionController);
  });

  describe('indexDocument', () => {
    it('should execute IndexDocumentCommand with provided file path', async () => {
      const dto = { filePath: 'documents/history.md' };

      const result = await controller.indexDocument(dto);

      expect(executeMock).toHaveBeenCalledWith(
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

      expect(writeFileMock).toHaveBeenCalledWith(
        expect.stringContaining('test-document.md') as string,
        mockFile.buffer,
      );
      expect(executeMock).toHaveBeenCalled();
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

      expect(writeFileMock).toHaveBeenCalledWith(
        expect.stringMatching(
          /uploads\/\d{4}-\d{2}-\d{2}-file_with_spaces___special_chars\.md/,
        ) as string,
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

      expect(writeFileMock).toHaveBeenCalledWith(
        expect.stringMatching(
          /uploads\/\d{4}-\d{2}-\d{2}-napoleon\.md/,
        ) as string,
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

      expect(executeMock).toHaveBeenCalledWith(
        expect.any(IndexDocumentCommand),
      );

      const execCalls = executeMock.mock.calls as Array<[IndexDocumentCommand]>;
      const executedCommand = execCalls[0][0];
      expect(executedCommand.filePath).toMatch(/uploads\/.*history\.md/);
    });
  });
});
