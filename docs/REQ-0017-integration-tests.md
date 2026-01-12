# REQ-0017: Integration Test Suite (Full Flow)

| Field | Value |
|-------|-------|
| **Status** | `TODO` |
| **Priority** | High |
| **Complexity** | Medium |
| **Estimated Effort** | 4-6 hours |
| **Dependencies** | All core modules |
| **Affects** | Backend tests, E2E tests |

---

## 1. Overview

**Current State:** Unit tests exist for individual handlers, but there's no integration test covering the complete user journey.

**Solution:** Create integration tests that verify the entire flow:
1. Upload Markdown file
2. Document gets indexed
3. AI extracts entities (mocked)
4. Entities saved to database
5. Events appear on Timeline
6. Search finds extracted entities

## 2. Objectives

- Verify complete data flow from upload to display
- Test async event-driven architecture
- Ensure database consistency across modules
- Mock external services (OpenAI) for deterministic tests
- Validate CQRS pattern works correctly

## 3. Technical Specification

### 3.1 Test Setup

```typescript
// backend/test/integration/full-flow.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/infrastructure/database/prisma.service';
import { OpenAIExtractorService } from '../../src/modules/extraction/domain/openai-extractor.service';

describe('Full Flow Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Mock OpenAI response
  const mockExtractionResult = {
    persons: [
      {
        fullName: 'Napoleon Bonaparte',
        firstName: 'Napoleon',
        lastName: 'Bonaparte',
        title: 'Emperor',
        birthDate: '1769-08-15',
        deathDate: '1821-05-05',
        description: 'French military and political leader',
      },
    ],
    events: [
      {
        title: 'Battle of Waterloo',
        description: 'Final defeat of Napoleon',
        dateStart: '1815-06-18',
        dateType: 'exact',
        location: 'Waterloo, Belgium',
        relatedPersonNames: ['Napoleon Bonaparte'],
      },
    ],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OpenAIExtractorService)
      .useValue({
        extractEntities: jest.fn().mockResolvedValue(mockExtractionResult),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.personEvent.deleteMany();
    await prisma.personDocument.deleteMany();
    await prisma.event.deleteMany();
    await prisma.person.deleteMany();
    await prisma.document.deleteMany();
  });

  // Tests go here...
});
```

### 3.2 Full Flow Test

```typescript
describe('Upload → Extract → Timeline Flow', () => {
  it('should complete the full document processing pipeline', async () => {
    // Step 1: Upload a Markdown file
    const markdownContent = `
# Napoleon Bonaparte

Napoleon Bonaparte (1769-1821) was a French military and political leader.

## Battle of Waterloo

The Battle of Waterloo took place on June 18, 1815 in Waterloo, Belgium.
It was Napoleon's final defeat.
    `.trim();

    const uploadResponse = await request(app.getHttpServer())
      .post('/api/v1/ingestion/upload')
      .attach('file', Buffer.from(markdownContent), {
        filename: 'napoleon.md',
        contentType: 'text/markdown',
      })
      .expect(201);

    const documentId = uploadResponse.body.id;
    expect(documentId).toBeDefined();

    // Step 2: Wait for async extraction (or poll status)
    await waitForExtraction(documentId);

    // Step 3: Verify Person was created
    const personsResponse = await request(app.getHttpServer())
      .get('/api/v1/knowledge/search')
      .query({ q: 'Napoleon' })
      .expect(200);

    expect(personsResponse.body.persons).toHaveLength(1);
    expect(personsResponse.body.persons[0].fullName).toBe('Napoleon Bonaparte');

    // Step 4: Verify Event was created
    expect(personsResponse.body.events).toHaveLength(1);
    expect(personsResponse.body.events[0].title).toBe('Battle of Waterloo');

    // Step 5: Verify Timeline shows the event
    const timelineResponse = await request(app.getHttpServer())
      .get('/api/v1/knowledge/timeline')
      .query({ dateStart: '1815-01-01', dateEnd: '1815-12-31' })
      .expect(200);

    expect(timelineResponse.body).toHaveLength(1);
    expect(timelineResponse.body[0].title).toBe('Battle of Waterloo');
    expect(timelineResponse.body[0].persons).toContain('Napoleon Bonaparte');

    // Step 6: Verify Person details include the event
    const personId = personsResponse.body.persons[0].id;
    const personResponse = await request(app.getHttpServer())
      .get(`/api/v1/knowledge/persons/${personId}`)
      .expect(200);

    expect(personResponse.body.events).toHaveLength(1);
    expect(personResponse.body.events[0].title).toBe('Battle of Waterloo');
  });

  async function waitForExtraction(
    documentId: string,
    maxAttempts = 10,
  ): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        include: { events: true, persons: true },
      });

      if (doc?.events.length || doc?.persons.length) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error('Extraction did not complete in time');
  }
});
```

### 3.3 Error Handling Test

```typescript
describe('Error Handling', () => {
  it('should handle extraction failure gracefully', async () => {
    // Override mock to throw error
    jest
      .spyOn(app.get(OpenAIExtractorService), 'extractEntities')
      .mockRejectedValueOnce(new Error('API rate limit exceeded'));

    const uploadResponse = await request(app.getHttpServer())
      .post('/api/v1/ingestion/upload')
      .attach('file', Buffer.from('# Test'), {
        filename: 'test.md',
        contentType: 'text/markdown',
      })
      .expect(201);

    // Document should be indexed even if extraction fails
    const documentId = uploadResponse.body.id;
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
    });

    expect(doc).toBeDefined();
    expect(doc?.fileName).toBe('test.md');
  });
});
```

### 3.4 Duplicate Handling Test

```typescript
describe('Duplicate Detection', () => {
  it('should not create duplicate persons', async () => {
    // Upload first document mentioning Napoleon
    await request(app.getHttpServer())
      .post('/api/v1/ingestion/upload')
      .attach('file', Buffer.from('# Napoleon Bonaparte'), {
        filename: 'doc1.md',
        contentType: 'text/markdown',
      })
      .expect(201);

    await waitForExtraction();

    // Upload second document mentioning Napoleon
    await request(app.getHttpServer())
      .post('/api/v1/ingestion/upload')
      .attach('file', Buffer.from('# Napoleon again'), {
        filename: 'doc2.md',
        contentType: 'text/markdown',
      })
      .expect(201);

    await waitForExtraction();

    // Should have only one Napoleon
    const persons = await prisma.person.findMany({
      where: { fullName: 'Napoleon Bonaparte' },
    });

    expect(persons).toHaveLength(1);

    // But linked to both documents
    const personDocs = await prisma.personDocument.findMany({
      where: { personId: persons[0].id },
    });

    expect(personDocs).toHaveLength(2);
  });
});
```

### 3.5 CRUD Integration Test

```typescript
describe('Manual CRUD with Extraction', () => {
  it('should allow editing extracted entities', async () => {
    // Upload and extract
    await request(app.getHttpServer())
      .post('/api/v1/ingestion/upload')
      .attach('file', Buffer.from('# Napoleon'), {
        filename: 'napoleon.md',
        contentType: 'text/markdown',
      });

    await waitForExtraction();

    // Get the extracted person
    const searchResponse = await request(app.getHttpServer())
      .get('/api/v1/knowledge/search')
      .query({ q: 'Napoleon' });

    const personId = searchResponse.body.persons[0].id;

    // Update the person with corrected data
    const updateResponse = await request(app.getHttpServer())
      .put(`/api/v1/knowledge/persons/${personId}`)
      .send({
        birthDate: '1769-08-15T00:00:00.000Z',
        description: 'Updated description with more details',
      })
      .expect(200);

    expect(updateResponse.body.description).toContain('Updated description');

    // Verify update persisted
    const personResponse = await request(app.getHttpServer())
      .get(`/api/v1/knowledge/persons/${personId}`)
      .expect(200);

    expect(personResponse.body.description).toContain('Updated description');
  });
});
```

## 4. Acceptance Criteria

- [ ] Full upload → extract → timeline flow test passes
- [ ] OpenAI service is properly mocked
- [ ] Database is cleaned between tests
- [ ] Async extraction is properly awaited
- [ ] Duplicate detection test passes
- [ ] Error handling test passes
- [ ] CRUD on extracted entities test passes
- [ ] Tests run in CI pipeline

## 5. Test Data Factory

```typescript
// backend/test/factories/document.factory.ts
export function createMarkdownContent(options: {
  persons?: Array<{ name: string; title?: string }>;
  events?: Array<{ title: string; date?: string; location?: string }>;
}): string {
  let content = '# Historical Document\n\n';

  if (options.persons) {
    content += '## People\n\n';
    for (const person of options.persons) {
      content += `- **${person.name}**`;
      if (person.title) content += ` (${person.title})`;
      content += '\n';
    }
    content += '\n';
  }

  if (options.events) {
    content += '## Events\n\n';
    for (const event of options.events) {
      content += `### ${event.title}\n`;
      if (event.date) content += `Date: ${event.date}\n`;
      if (event.location) content += `Location: ${event.location}\n`;
      content += '\n';
    }
  }

  return content;
}
```

## 6. CI Configuration

```yaml
# .github/workflows/ci.yaml
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: [backend-ci]
    
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: --health-cmd pg_isready

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        working-directory: ./backend
        run: npm ci
      
      - name: Setup database
        working-directory: ./backend
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
      
      - name: Run integration tests
        working-directory: ./backend
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
```

## 7. References

- [NestJS E2E Testing](https://docs.nestjs.com/fundamentals/testing#end-to-end-testing)
- [Jest Manual Mocks](https://jestjs.io/docs/manual-mocks)
- [Supertest](https://github.com/ladjs/supertest)
