import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../../shared/infrastructure/database/prisma.service';
import { GetEventHandler } from '../get-event.handler';
import { GetEventQuery } from '../../impl/get-event.query';

describe('GetEventHandler', () => {
  let handler: GetEventHandler;
  let prisma: PrismaService;
  let testEventId: string;
  let testPersonId: string;
  let testDocumentId: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [GetEventHandler, PrismaService],
    }).compile();

    handler = module.get<GetEventHandler>(GetEventHandler);
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
        filePath: `test-doc-event-${uniqueId}.md`,
        fileName: `test-doc-event-${uniqueId}.md`,
        title: 'Test Document',
        contentHash: `test-hash-event-${uniqueId}`,
        lastModified: new Date(),
      },
    });
    testDocumentId = document.id;

    const person = await prisma.person.create({
      data: {
        fullName: 'Test Person',
        firstName: 'Test',
        lastName: 'Person',
      },
    });
    testPersonId = person.id;

    const event = await prisma.event.create({
      data: {
        title: 'Test Event',
        description: 'Test event description',
        dateStart: new Date('2024-01-01'),
        dateEnd: new Date('2024-01-02'),
        dateType: 'exact',
        location: 'Test Location',
        documentId: testDocumentId,
      },
    });
    testEventId = event.id;

    // Create relationship
    await prisma.personEvent.create({
      data: {
        personId: testPersonId,
        eventId: testEventId,
        role: 'organizer',
        context: 'Organized the event',
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.personEvent.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.person.deleteMany({});
    await prisma.document.deleteMany({});
  });

  it('should return event with related persons and document', async () => {
    const query = new GetEventQuery(testEventId);
    const result = await handler.execute(query);

    expect(result).toBeDefined();
    expect(result.id).toBe(testEventId);
    expect(result.title).toBe('Test Event');
    expect(result.description).toBe('Test event description');
    expect(result.dateStart).toEqual(new Date('2024-01-01'));
    expect(result.dateEnd).toEqual(new Date('2024-01-02'));
    expect(result.dateType).toBe('exact');
    expect(result.location).toBe('Test Location');
    expect(result.document?.id).toBe(testDocumentId);
    expect(result.document?.filePath).toMatch(/^test-doc-event-\d+\.md$/);
    expect(result.document?.fileName).toMatch(/^test-doc-event-\d+\.md$/);
    expect(result.document?.title).toBe('Test Document');
    expect(result.persons).toHaveLength(1);
    expect(result.persons[0].id).toBe(testPersonId);
    expect(result.persons[0].fullName).toBe('Test Person');
    expect(result.persons[0].role).toBe('organizer');
    expect(result.persons[0].context).toBe('Organized the event');
  });

  it('should throw NotFoundException when event not found', async () => {
    const query = new GetEventQuery('non-existent-id');

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(query)).rejects.toThrow(
      'Event with ID non-existent-id not found',
    );
  });

  it('should handle event with no related persons', async () => {
    const event = await prisma.event.create({
      data: {
        title: 'Isolated Event',
        description: 'Event with no persons',
        documentId: testDocumentId,
      },
    });

    const query = new GetEventQuery(event.id);
    const result = await handler.execute(query);

    expect(result.id).toBe(event.id);
    expect(result.persons).toHaveLength(0);

    // Cleanup
    await prisma.event.delete({ where: { id: event.id } });
  });
});
