import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaService } from '../../../../../shared/infrastructure/database/prisma.service';
import { GetTimelineHandler } from '../get-timeline.handler';
import { GetTimelineQuery } from '../../impl/get-timeline.query';

describe('GetTimelineHandler', () => {
  let handler: GetTimelineHandler;
  let prisma: PrismaService;
  let testDocumentId: string;
  let testPersonId: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [GetTimelineHandler, PrismaService],
    }).compile();

    handler = module.get<GetTimelineHandler>(GetTimelineHandler);
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
        filePath: `test-doc-timeline-${uniqueId}.md`,
        fileName: `test-doc-timeline-${uniqueId}.md`,
        contentHash: `test-hash-timeline-${uniqueId}`,
        lastModified: new Date(),
      },
    });
    testDocumentId = document.id;

    const person = await prisma.person.create({
      data: {
        fullName: 'Test Person',
      },
    });
    testPersonId = person.id;

    // Create events with different dates
    const event1 = await prisma.event.create({
      data: {
        title: 'Event 1',
        description: 'First event',
        dateStart: new Date('2020-01-01'),
        documentId: testDocumentId,
      },
    });

    const event2 = await prisma.event.create({
      data: {
        title: 'Event 2',
        description: 'Second event',
        dateStart: new Date('2021-06-15'),
        documentId: testDocumentId,
      },
    });

    const event3 = await prisma.event.create({
      data: {
        title: 'Event 3',
        description: 'Third event',
        dateStart: new Date('2022-12-31'),
        documentId: testDocumentId,
      },
    });

    // Create relationships
    await prisma.personEvent.create({
      data: {
        personId: testPersonId,
        eventId: event1.id,
      },
    });

    await prisma.personEvent.create({
      data: {
        personId: testPersonId,
        eventId: event2.id,
      },
    });

    await prisma.personEvent.create({
      data: {
        personId: testPersonId,
        eventId: event3.id,
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

  it('should return events ordered by dateStart ASC', async () => {
    const query = new GetTimelineQuery();
    const result = await handler.execute(query);

    expect(result.length).toBeGreaterThanOrEqual(3);
    // Check ordering
    for (let i = 1; i < result.length; i++) {
      const prevDate = result[i - 1].dateStart;
      const currDate = result[i].dateStart;
      if (prevDate && currDate) {
        expect(prevDate.getTime()).toBeLessThanOrEqual(currDate.getTime());
      }
    }
  });

  it('should filter events by dateStart range', async () => {
    const query = new GetTimelineQuery(
      new Date('2021-01-01'),
      new Date('2021-12-31'),
    );
    const result = await handler.execute(query);

    result.forEach((event) => {
      if (event.dateStart) {
        expect(event.dateStart.getTime()).toBeGreaterThanOrEqual(
          new Date('2021-01-01').getTime(),
        );
        expect(event.dateStart.getTime()).toBeLessThanOrEqual(
          new Date('2021-12-31').getTime(),
        );
      }
    });
  });

  it('should include related persons names', async () => {
    const query = new GetTimelineQuery();
    const result = await handler.execute(query);

    expect(result.length).toBeGreaterThan(0);
    result.forEach((event) => {
      expect(event.persons).toBeDefined();
      expect(Array.isArray(event.persons)).toBe(true);
    });
  });

  it('should include document reference', async () => {
    const query = new GetTimelineQuery();
    const result = await handler.execute(query);

    expect(result.length).toBeGreaterThan(0);
    result.forEach((event) => {
      expect(event.document).toBeDefined();
      expect(event.document.id).toBeDefined();
    });
  });

  it('should handle events without dateStart', async () => {
    const eventWithoutDate = await prisma.event.create({
      data: {
        title: 'Event Without Date',
        documentId: testDocumentId,
      },
    });

    const query = new GetTimelineQuery();
    const result = await handler.execute(query);

    // Event without date should still be included when no date filter
    expect(result.some((e) => e.id === eventWithoutDate.id)).toBe(true);

    // Cleanup
    await prisma.event.delete({ where: { id: eventWithoutDate.id } });
  });

  it('should respect limit and offset', async () => {
    const query = new GetTimelineQuery(undefined, undefined, 2, 0);
    const result = await handler.execute(query);

    expect(result.length).toBeLessThanOrEqual(2);
  });
});
