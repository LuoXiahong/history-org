import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
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
    if (prisma) {
      await prisma.personEvent.deleteMany({});
      await prisma.personDocument.deleteMany({});
      await prisma.event.deleteMany({});
      await prisma.person.deleteMany({});
      await prisma.document.deleteMany({});
    }
    if (app) {
      await app.close();
    }
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

  describe('POST /knowledge/persons', () => {
    it('should create a person and return 201', () => {
      return request(app.getHttpServer())
        .post('/knowledge/persons')
        .send({
          fullName: 'New Person',
          firstName: 'New',
          lastName: 'Person',
          title: 'Test Title',
          birthDate: '1900-01-01',
          deathDate: '2000-01-01',
          description: 'Test description',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.fullName).toBe('New Person');
          expect(res.body.firstName).toBe('New');
          expect(res.body.lastName).toBe('Person');
          expect(res.body.title).toBe('Test Title');
        });
    });

    it('should create a person with minimal data', () => {
      return request(app.getHttpServer())
        .post('/knowledge/persons')
        .send({
          fullName: 'Minimal Person',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.fullName).toBe('Minimal Person');
        });
    });

    it('should reject duplicate person names with 409', () => {
      return request(app.getHttpServer())
        .post('/knowledge/persons')
        .send({
          fullName: 'Test Person', // Same as existing testPersonId
        })
        .expect(409);
    });
  });

  describe('PUT /knowledge/persons/:id', () => {
    it('should update person and return 200', () => {
      return request(app.getHttpServer())
        .put(`/knowledge/persons/${testPersonId}`)
        .send({
          fullName: 'Updated Person',
          title: 'Updated Title',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testPersonId);
          expect(res.body.fullName).toBe('Updated Person');
          expect(res.body.title).toBe('Updated Title');
        });
    });

    it('should return 404 for non-existent person', () => {
      return request(app.getHttpServer())
        .put('/knowledge/persons/non-existent-id')
        .send({
          fullName: 'Updated Name',
        })
        .expect(404);
    });

    it('should reject duplicate names with 409', async () => {
      // Create another person
      const newPerson = await prisma.person.create({
        data: {
          fullName: 'Another Person',
        },
      });

      return request(app.getHttpServer())
        .put(`/knowledge/persons/${testPersonId}`)
        .send({
          fullName: 'Another Person', // Same as newPerson
        })
        .expect(409)
        .then(async () => {
          // Cleanup
          await prisma.person.delete({ where: { id: newPerson.id } });
        });
    });
  });

  describe('DELETE /knowledge/persons/:id', () => {
    it('should delete person and return 204', async () => {
      // Create a person to delete
      const personToDelete = await prisma.person.create({
        data: {
          fullName: 'Person To Delete',
        },
      });

      return request(app.getHttpServer())
        .delete(`/knowledge/persons/${personToDelete.id}`)
        .expect(204)
        .then(async () => {
          // Verify person is deleted
          const person = await prisma.person.findUnique({
            where: { id: personToDelete.id },
          });
          expect(person).toBeNull();
        });
    });

    it('should return 404 for non-existent person', () => {
      return request(app.getHttpServer())
        .delete('/knowledge/persons/non-existent-id')
        .expect(404);
    });

    it('should cascade delete relationships', async () => {
      // Create a person with relationships
      const personToDelete = await prisma.person.create({
        data: {
          fullName: 'Person With Relations',
        },
      });

      await prisma.personEvent.create({
        data: {
          personId: personToDelete.id,
          eventId: testEventId,
        },
      });

      await prisma.personDocument.create({
        data: {
          personId: personToDelete.id,
          documentId: testDocumentId,
        },
      });

      return request(app.getHttpServer())
        .delete(`/knowledge/persons/${personToDelete.id}`)
        .expect(204)
        .then(async () => {
          // Verify relationships are deleted
          const personEvents = await prisma.personEvent.findMany({
            where: { personId: personToDelete.id },
          });
          expect(personEvents).toHaveLength(0);

          const personDocuments = await prisma.personDocument.findMany({
            where: { personId: personToDelete.id },
          });
          expect(personDocuments).toHaveLength(0);
        });
    });
  });

  describe('POST /knowledge/enrich-person', () => {
    it('should enrich person data and return 200', () => {
      // Note: This test will return minimal data if OpenAI API key is not configured
      // In a real scenario, you'd mock the OpenAI service
      return request(app.getHttpServer())
        .post('/knowledge/enrich-person')
        .send({
          name: 'Napoleon Bonaparte',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.fullName).toBeDefined();
          // In test mode without API key, it returns minimal data
          expect(res.body.fullName).toBe('Napoleon Bonaparte');
          // Verify it's not a PersonResponseDto (which would have id, events, documents)
          expect(res.body.id).toBeUndefined();
          expect(res.body.events).toBeUndefined();
          expect(res.body.documents).toBeUndefined();
        });
    });

    it('should require name field', () => {
      return request(app.getHttpServer())
        .post('/knowledge/enrich-person')
        .send({})
        .expect(400);
    });
  });

  describe('POST /knowledge/events', () => {
    it('should create an event and return 201', () => {
      return request(app.getHttpServer())
        .post('/knowledge/events')
        .send({
          title: 'New Event',
          description: 'New event description',
          dateStart: '2024-01-01',
          dateEnd: '2024-01-02',
          dateType: 'exact',
          location: 'Test Location',
          documentId: testDocumentId,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.title).toBe('New Event');
          expect(res.body.description).toBe('New event description');
          expect(res.body.location).toBe('Test Location');
          expect(res.body.document).toBeDefined();
        });
    });

    it('should create an event without document', () => {
      return request(app.getHttpServer())
        .post('/knowledge/events')
        .send({
          title: 'Manual Event',
          description: 'Manually created event',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.title).toBe('Manual Event');
          expect(res.body.document).toBeUndefined();
        });
    });

    it('should return 400 for invalid document ID', () => {
      return request(app.getHttpServer())
        .post('/knowledge/events')
        .send({
          title: 'Test Event',
          documentId: 'non-existent-document-id',
        })
        .expect(400);
    });
  });

  describe('PUT /knowledge/events/:id', () => {
    it('should update event and return 200', () => {
      return request(app.getHttpServer())
        .put(`/knowledge/events/${testEventId}`)
        .send({
          title: 'Updated Event',
          description: 'Updated description',
          location: 'Updated Location',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testEventId);
          expect(res.body.title).toBe('Updated Event');
          expect(res.body.description).toBe('Updated description');
          expect(res.body.location).toBe('Updated Location');
        });
    });

    it('should return 404 for non-existent event', () => {
      return request(app.getHttpServer())
        .put('/knowledge/events/non-existent-id')
        .send({
          title: 'Updated Title',
        })
        .expect(404);
    });

    it('should return 400 for invalid document ID', () => {
      return request(app.getHttpServer())
        .put(`/knowledge/events/${testEventId}`)
        .send({
          documentId: 'non-existent-document-id',
        })
        .expect(400);
    });
  });

  describe('DELETE /knowledge/events/:id', () => {
    it('should delete event and return 204', async () => {
      // Create an event to delete
      const eventToDelete = await prisma.event.create({
        data: {
          title: 'Event To Delete',
          documentId: testDocumentId,
        },
      });

      return request(app.getHttpServer())
        .delete(`/knowledge/events/${eventToDelete.id}`)
        .expect(204)
        .then(async () => {
          // Verify event is deleted
          const event = await prisma.event.findUnique({
            where: { id: eventToDelete.id },
          });
          expect(event).toBeNull();
        });
    });

    it('should return 404 for non-existent event', () => {
      return request(app.getHttpServer())
        .delete('/knowledge/events/non-existent-id')
        .expect(404);
    });

    it('should cascade delete PersonEvent relationships', async () => {
      // Create an event with relationships
      const eventToDelete = await prisma.event.create({
        data: {
          title: 'Event With Relations',
          documentId: testDocumentId,
        },
      });

      await prisma.personEvent.create({
        data: {
          personId: testPersonId,
          eventId: eventToDelete.id,
        },
      });

      return request(app.getHttpServer())
        .delete(`/knowledge/events/${eventToDelete.id}`)
        .expect(204)
        .then(async () => {
          // Verify relationships are deleted
          const personEvents = await prisma.personEvent.findMany({
            where: { eventId: eventToDelete.id },
          });
          expect(personEvents).toHaveLength(0);
        });
    });
  });
});
