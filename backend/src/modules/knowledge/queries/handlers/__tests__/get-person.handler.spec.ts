import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../../shared/infrastructure/database/prisma.service';
import { GetPersonHandler } from '../get-person.handler';
import { GetPersonQuery } from '../../impl/get-person.query';

describe('GetPersonHandler', () => {
  let handler: GetPersonHandler;
  let prisma: PrismaService;
  let testPersonId: string;
  let testEventId: string;
  let testDocumentId: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [GetPersonHandler, PrismaService],
    }).compile();

    handler = module.get<GetPersonHandler>(GetPersonHandler);
    prisma = module.get<PrismaService>(PrismaService);

    // Clean up any existing test data first
    await prisma.personEvent.deleteMany({});
    await prisma.personDocument.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.person.deleteMany({});
    await prisma.document.deleteMany({});

    // Seed test data with unique paths
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

    const person = await prisma.person.create({
      data: {
        fullName: 'Test Person',
        firstName: 'Test',
        lastName: 'Person',
        title: 'Test Title',
        description: 'Test description',
      },
    });
    testPersonId = person.id;

    const event = await prisma.event.create({
      data: {
        title: 'Test Event',
        description: 'Test event description',
        documentId: testDocumentId,
        dateStart: new Date('2024-01-01'),
      },
    });
    testEventId = event.id;

    // Create relationships
    await prisma.personEvent.create({
      data: {
        personId: testPersonId,
        eventId: testEventId,
        role: 'participant',
        context: 'Test context',
      },
    });

    await prisma.personDocument.create({
      data: {
        personId: testPersonId,
        documentId: testDocumentId,
        context: 'Mentioned in document',
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.personEvent.deleteMany({});
    await prisma.personDocument.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.person.deleteMany({});
    await prisma.document.deleteMany({});
  });

  it('should return person with related events and documents', async () => {
    const query = new GetPersonQuery(testPersonId);
    const result = await handler.execute(query);

    expect(result).toBeDefined();
    expect(result.id).toBe(testPersonId);
    expect(result.fullName).toBe('Test Person');
    expect(result.firstName).toBe('Test');
    expect(result.lastName).toBe('Person');
    expect(result.title).toBe('Test Title');
    expect(result.description).toBe('Test description');
    expect(result.events).toHaveLength(1);
    expect(result.events[0].id).toBe(testEventId);
    expect(result.events[0].title).toBe('Test Event');
    expect(result.events[0].role).toBe('participant');
    expect(result.events[0].context).toBe('Test context');
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].id).toBe(testDocumentId);
    expect(result.documents[0].context).toBe('Mentioned in document');
  });

  it('should throw NotFoundException when person not found', async () => {
    const query = new GetPersonQuery('non-existent-id');

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(query)).rejects.toThrow(
      'Person with ID non-existent-id not found',
    );
  });

  it('should handle person with no related events or documents', async () => {
    const person = await prisma.person.create({
      data: {
        fullName: 'Isolated Person',
        firstName: 'Isolated',
        lastName: 'Person',
      },
    });

    const query = new GetPersonQuery(person.id);
    const result = await handler.execute(query);

    expect(result.id).toBe(person.id);
    expect(result.events).toHaveLength(0);
    expect(result.documents).toHaveLength(0);

    // Cleanup
    await prisma.person.delete({ where: { id: person.id } });
  });
});
