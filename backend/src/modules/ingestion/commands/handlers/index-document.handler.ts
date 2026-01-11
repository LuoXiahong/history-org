import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { FileSystemService } from '../../../../shared/infrastructure/file-system/file-system.service';
import { hashContent } from '../../../../shared/utils/hash.util';
import { IndexDocumentCommand } from '../impl/index-document.command';
import { DocumentIndexedEvent } from '../../events/impl/document-indexed.event';
import { basename } from 'path';
import { Document as PrismaDocument } from '@db';

@Injectable()
@CommandHandler(IndexDocumentCommand)
export class IndexDocumentHandler implements ICommandHandler<IndexDocumentCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileSystem: FileSystemService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: IndexDocumentCommand): Promise<{
    id: string;
    filePath: string;
    fileName: string;
    title: string | null;
    contentHash: string;
    lastModified: Date;
    indexedAt: Date;
    updatedAt: Date;
  }> {
    const { filePath } = command;

    const fileExists = await this.fileSystem.exists(filePath);
    if (!fileExists) {
      throw new NotFoundException(`File not found: ${filePath}`);
    }

    const content = await this.fileSystem.readFile(filePath);
    const stats = await this.fileSystem.getFileStats(filePath);
    const contentHash = hashContent(content);
    const fileName = basename(filePath);

    const existingDocument = await this.prisma.document.findUnique({
      where: { filePath },
    });

    let document: PrismaDocument;
    if (existingDocument) {
      if (existingDocument.contentHash === contentHash) {
        return existingDocument;
      }

      document = await this.prisma.document.update({
        where: { id: existingDocument.id },
        data: {
          fileName,
          contentHash,
          lastModified: stats.mtime,
        },
      });
    } else {
      document = await this.prisma.document.create({
        data: {
          filePath,
          fileName,
          contentHash,
          lastModified: stats.mtime,
        },
      });
    }

    this.eventBus.publish(
      new DocumentIndexedEvent(document.id, document.filePath),
    );

    return document;
  }
}
