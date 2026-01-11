import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../../shared/infrastructure/database/prisma.service';
import { CreateEventHandler } from '../create-event.handler';
import { CreateEventCommand } from '../../impl/create-event.command';

describe('CreateEventHandler', () => {
  let handler: CreateEventHandler;
  let prisma: PrismaService;
  let testDocumentId: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [CreateEventHandler, PrismaService],
    }).compile();

    handler = module.get<CreateEventHandler>(CreateEventHandler);
    prisma = module.get<PrismaService>(PrismaService);

    // Clean up test data
    await prisma.personEvent.deleteMany({});
    await prisma.personDocument.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.person.deleteMany({});
    await prisma.document.deleteMany({});

    // Create test document
    const uniqueId = Date.now().toString();
    const document = await prisma.document.create({
      data: {
        filePath: `test-doc-${uniqueId}.md`,
        fileName: `test-doc-${uniqueId}.md`,
        contentHash: `test-hash-${uniqueId}`,
        lastModified: new Date(),
      },
    });
    testDocumentId = document.id;
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

  it('should create an event when valid data provided', async () => {
    const command = new CreateEventCommand(
      'Battle of Waterloo',
      'Final defeat of Napoleon',
      new Date('1815-06-18'),
      undefined,
      'exact',
      'Waterloo, Belgium',
      testDocumentId,
    );

    const result = await handler.execute(command);

    expect(result).toBeDefined();
    expect(result.title).toBe('Battle of Waterloo');
    expect(result.description).toBe('Final defeat of Napoleon');
    expect(result.dateStart).toBeDefined();
    expect(result.dateType).toBe('exact');
    expect(result.location).toBe('Waterloo, Belgium');
    expect(result.document).toBeDefined();
    expect(result.document?.id).toBe(testDocumentId);
    expect(result.id).toBeDefined();
    expect(result.persons).toEqual([]);
  });

  it('should create an event without document (manual entry)', async () => {
    const command = new CreateEventCommand(
      'Manual Event',
      'Manually created event',
      new Date('2024-01-01'),
    );

    const result = await handler.execute(command);

    expect(result).toBeDefined();
    expect(result.title).toBe('Manual Event');
    expect(result.description).toBe('Manually created event');
    expect(result.document).toBeUndefined();
  });

  it('should create an event with minimal data', async () => {
    const command = new CreateEventCommand('Simple Event');

    const result = await handler.execute(command);

    expect(result).toBeDefined();
    expect(result.title).toBe('Simple Event');
    expect(result.description).toBeUndefined();
    expect(result.dateStart).toBeUndefined();
    expect(result.dateEnd).toBeUndefined();
    expect(result.dateType).toBeUndefined();
    expect(result.location).toBeUndefined();
    expect(result.document).toBeUndefined();
  });

  it('should throw BadRequestException when documentId is invalid', async () => {
    const command = new CreateEventCommand(
      'Test Event',
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

  it('should handle optional fields correctly', async () => {
    const command = new CreateEventCommand(
      'Test Event',
      'Description',
      new Date('2024-01-01'),
      new Date('2024-01-02'),
      'approximate',
      'Test Location',
    );

    const result = await handler.execute(command);

    expect(result.title).toBe('Test Event');
    expect(result.description).toBe('Description');
    expect(result.dateStart).toBeDefined();
    expect(result.dateEnd).toBeDefined();
    expect(result.dateType).toBe('approximate');
    expect(result.location).toBe('Test Location');
  });
});
