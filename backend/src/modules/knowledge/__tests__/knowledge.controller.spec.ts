import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import request from 'supertest';
import { KnowledgeController } from '../knowledge.controller';
import { KnowledgeModule } from '../knowledge.module';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

describe('KnowledgeController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testPersonId: string;
  let testEventId: string;
  let testDocumentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [KnowledgeModule, CqrsModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

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
        filePath: `test-doc-controller-${uniqueId}.md`,
        fileName: `test-doc-controller-${uniqueId}.md`,
        title: 'Test Document',
        contentHash: `test-hash-controller-${uniqueId}`,
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
      },
    });
    testPersonId = person.id;

    const event = await prisma.event.create({
      data: {
        title: 'Test Event',
        description: 'Test event description',
        dateStart: new Date('2024-01-01'),
        documentId: testDocumentId,
      },
    });
    testEventId = event.id;

    await prisma.personEvent.create({
      data: {
        personId: testPersonId,
        eventId: testEventId,
        role: 'participant',
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

  afterAll(async () => {
    // Clean up test data
    await prisma.personEvent.deleteMany({});
    await prisma.personDocument.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.person.deleteMany({});
    await prisma.document.deleteMany({});
    await app.close();
  });

  describe('GET /knowledge/persons/:id', () => {
    it('should return person data', () => {
      return request(app.getHttpServer())
        .get(`/knowledge/persons/${testPersonId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testPersonId);
          expect(res.body.fullName).toBe('Test Person');
          expect(res.body.events).toBeDefined();
          expect(res.body.documents).toBeDefined();
        });
    });

    it('should return 404 for non-existent person', () => {
      return request(app.getHttpServer())
        .get('/knowledge/persons/non-existent-id')
        .expect(404);
    });
  });

  describe('GET /knowledge/events/:id', () => {
    it('should return event data', () => {
      return request(app.getHttpServer())
        .get(`/knowledge/events/${testEventId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testEventId);
          expect(res.body.title).toBe('Test Event');
          expect(res.body.document).toBeDefined();
          expect(res.body.persons).toBeDefined();
        });
    });

    it('should return 404 for non-existent event', () => {
      return request(app.getHttpServer())
        .get('/knowledge/events/non-existent-id')
        .expect(404);
    });
  });

  describe('GET /knowledge/search', () => {
    it('should return search results', () => {
      return request(app.getHttpServer())
        .get('/knowledge/search?q=Test')
        .expect(200)
        .expect((res) => {
          expect(res.body.persons).toBeDefined();
          expect(res.body.events).toBeDefined();
          expect(res.body.totalPersons).toBeDefined();
          expect(res.body.totalEvents).toBeDefined();
        });
    });

    it('should handle pagination', () => {
      return request(app.getHttpServer())
        .get('/knowledge/search?q=Test&limit=10&offset=0')
        .expect(200)
        .expect((res) => {
          expect(res.body.persons).toBeDefined();
          expect(res.body.events).toBeDefined();
        });
    });
  });

  describe('GET /knowledge/timeline', () => {
    it('should return timeline events', () => {
      return request(app.getHttpServer())
        .get('/knowledge/timeline')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0].id).toBeDefined();
            expect(res.body[0].title).toBeDefined();
            expect(res.body[0].persons).toBeDefined();
            expect(res.body[0].document).toBeDefined();
          }
        });
    });

    it('should filter by date range', () => {
      return request(app.getHttpServer())
        .get(
          '/knowledge/timeline?dateStart=2024-01-01T00:00:00Z&dateEnd=2024-12-31T23:59:59Z',
        )
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
