import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaService } from '../../../../../shared/infrastructure/database/prisma.service';
import { SearchEverythingHandler } from '../search-everything.handler';
import { SearchEverythingQuery } from '../../impl/search-everything.query';

describe('SearchEverythingHandler', () => {
  let handler: SearchEverythingHandler;
  let prisma: PrismaService;
  let testDocumentId: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      providers: [SearchEverythingHandler, PrismaService],
    }).compile();

    handler = module.get<SearchEverythingHandler>(SearchEverythingHandler);
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
        filePath: `test-doc-search-${uniqueId}.md`,
        fileName: `test-doc-search-${uniqueId}.md`,
        contentHash: `test-hash-search-${uniqueId}`,
        lastModified: new Date(),
      },
    });
    testDocumentId = document.id;

    // Create persons
    const person1 = await prisma.person.create({
      data: {
        fullName: 'Napoleon Bonaparte',
        firstName: 'Napoleon',
        lastName: 'Bonaparte',
        title: 'Emperor',
        description: 'French military leader',
      },
    });

    const person2 = await prisma.person.create({
      data: {
        fullName: 'Julius Caesar',
        firstName: 'Julius',
        lastName: 'Caesar',
        title: 'Dictator',
        description: 'Roman general',
      },
    });

    // Create events
    const event1 = await prisma.event.create({
      data: {
        title: 'Battle of Waterloo',
        description: 'Final defeat of Napoleon',
        location: 'Waterloo, Belgium',
        documentId: testDocumentId,
      },
    });

    const event2 = await prisma.event.create({
      data: {
        title: 'Crossing the Rubicon',
        description: 'Caesar crossed the Rubicon',
        location: 'Rubicon River',
        documentId: testDocumentId,
      },
    });

    // Create relationships
    await prisma.personEvent.create({
      data: {
        personId: person1.id,
        eventId: event1.id,
        role: 'participant',
      },
    });

    await prisma.personEvent.create({
      data: {
        personId: person2.id,
        eventId: event2.id,
        role: 'leader',
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

  it('should search persons by fullName', async () => {
    const query = new SearchEverythingQuery('Napoleon');
    const result = await handler.execute(query);

    expect(result.persons.length).toBeGreaterThan(0);
    expect(result.persons.some((p) => p.fullName.includes('Napoleon'))).toBe(
      true,
    );
  });

  it('should search persons by title', async () => {
    const query = new SearchEverythingQuery('Emperor');
    const result = await handler.execute(query);

    expect(result.persons.length).toBeGreaterThan(0);
    // SQLite contains is case-insensitive, so check for case-insensitive match
    expect(
      result.persons.some(
        (p) => p.title && p.title.toLowerCase().includes('emperor'),
      ),
    ).toBe(true);
  });

  it('should search events by title', async () => {
    const query = new SearchEverythingQuery('Waterloo');
    const result = await handler.execute(query);

    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.some((e) => e.title.includes('Waterloo'))).toBe(true);
  });

  it('should search events by location', async () => {
    const query = new SearchEverythingQuery('Belgium');
    const result = await handler.execute(query);

    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.some((e) => e.location?.includes('Belgium'))).toBe(
      true,
    );
  });

  it('should return paginated results', async () => {
    const query = new SearchEverythingQuery('a', 1, 0);
    const result = await handler.execute(query);

    expect(result.persons.length).toBeLessThanOrEqual(1);
    expect(result.events.length).toBeLessThanOrEqual(1);
  });

  it('should return total counts', async () => {
    const query = new SearchEverythingQuery('a');
    const result = await handler.execute(query);

    expect(result.totalPersons).toBeGreaterThanOrEqual(0);
    expect(result.totalEvents).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty search query', async () => {
    const query = new SearchEverythingQuery('');
    const result = await handler.execute(query);

    expect(result).toBeDefined();
    expect(result.persons).toBeDefined();
    expect(result.events).toBeDefined();
  });
});
