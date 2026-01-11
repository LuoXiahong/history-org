import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../../shared/infrastructure/database/prisma.service';
import { UpdateEventHandler } from '../update-event.handler';
import { UpdateEventCommand } from '../../impl/update-event.command';

describe('UpdateEventHandler', () => {
  let handler: UpdateEventHandler;
  let prisma: PrismaService;
  let testEventId: string;
  let testDocumentId: string;
  let testDocumentId2: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [UpdateEventHandler, PrismaService],
    }).compile();

    handler = module.get<UpdateEventHandler>(UpdateEventHandler);
    prisma = module.get<PrismaService>(PrismaService);

    // Clean up test data
    await prisma.personEvent.deleteMany({});
    await prisma.personDocument.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.person.deleteMany({});
    await prisma.document.deleteMany({});

    // Create test documents
    const uniqueId = Date.now().toString();
    const document1 = await prisma.document.create({
      data: {
        filePath: `test-doc-1-${uniqueId}.md`,
        fileName: `test-doc-1-${uniqueId}.md`,
        contentHash: `test-hash-1-${uniqueId}`,
        lastModified: new Date(),
      },
    });
    testDocumentId = document1.id;

    const document2 = await prisma.document.create({
      data: {
        filePath: `test-doc-2-${uniqueId}.md`,
        fileName: `test-doc-2-${uniqueId}.md`,
        contentHash: `test-hash-2-${uniqueId}`,
        lastModified: new Date(),
      },
    });
    testDocumentId2 = document2.id;

    // Create test event
    const event = await prisma.event.create({
      data: {
        title: 'Original Event',
        description: 'Original description',
        dateStart: new Date('2024-01-01'),
        documentId: testDocumentId,
      },
    });
    testEventId = event.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.personEvent.deleteMany({});
    await prisma.personDocument.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.person.deleteMany({});
    await prisma.document.deleteMany({});
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should update event when valid data provided', async () => {
    const command = new UpdateEventCommand(
      testEventId,
      'Updated Event',
      'Updated description',
      new Date('2024-02-01'),
      new Date('2024-02-02'),
      'exact',
      'Updated Location',
      testDocumentId2,
    );

    const result = await handler.execute(command);

    expect(result).toBeDefined();
    expect(result.id).toBe(testEventId);
    expect(result.title).toBe('Updated Event');
    expect(result.description).toBe('Updated description');
    expect(result.dateStart).toBeDefined();
    expect(result.dateEnd).toBeDefined();
    expect(result.dateType).toBe('exact');
    expect(result.location).toBe('Updated Location');
    expect(result.document?.id).toBe(testDocumentId2);
  });

  it('should update partial fields', async () => {
    const command = new UpdateEventCommand(
      testEventId,
      'Updated Title Only',
    );

    const result = await handler.execute(command);

    expect(result.id).toBe(testEventId);
    expect(result.title).toBe('Updated Title Only');
    expect(result.description).toBe('Original description'); // Unchanged
    expect(result.document?.id).toBe(testDocumentId); // Unchanged
  });

  it('should throw NotFoundException when event not found', async () => {
    const command = new UpdateEventCommand('non-existent-id', 'New Title');

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(command)).rejects.toThrow(
      'Event with ID non-existent-id not found',
    );
  });

  it('should throw BadRequestException when documentId is invalid', async () => {
    const command = new UpdateEventCommand(
      testEventId,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'non-existent-document-id',
    );

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    await expect(handler.execute(command)).rejects.toThrow(
      "Document with ID 'non-existent-document-id' not found",
    );
  });

  it('should allow removing document by setting documentId to undefined', async () => {
    const command = new UpdateEventCommand(
      testEventId,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    const result = await handler.execute(command);

    expect(result.document).toBeUndefined();
  });

  it('should clear optional fields when set to empty', async () => {
    const command = new UpdateEventCommand(
      testEventId,
      undefined,
      '', // Empty string should be treated as null
      undefined,
      undefined,
      undefined,
      '',
    );

    const result = await handler.execute(command);

    expect(result.description).toBeUndefined();
    expect(result.location).toBeUndefined();
  });
});
