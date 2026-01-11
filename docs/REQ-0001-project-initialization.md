# REQ-0001: Project Initialization

**Status:** `DRAFT`  
**Created:** 2025-01-27  
**UUID:** 0001  
**Name:** Project Initialization

## Overview

This requirement defines the foundational architecture for the History Organizer project. The system is a personal knowledge management tool that indexes Markdown files and extracts structured historical data (Persons, Events, Dates) using AI.

## Requirements

### 1. Architecture Overview

#### System Components

The system follows a **hybrid storage architecture** where:

- **Source of Truth:** Local Markdown files stored in the file system
- **Database:** SQLite (via Prisma ORM) stores:
  - Document metadata (file path, last modified, content hash)
  - Extracted entities (Persons, Events, Dates)
  - Relationships between entities
  - Indexing and search metadata

#### Architecture Flow

```
┌─────────────────┐
│  Markdown Files │ (Source of Truth)
│  (File System)  │
└────────┬────────┘
         │
         │ Read/Write Operations
         │
┌────────▼─────────────────────────────────────┐
│         NestJS Backend (CQRS)                │
│  ┌──────────────────────────────────────┐   │
│  │  Ingestion Module                    │   │
│  │  - Commands: IndexDocumentCommand    │   │
│  │  - Queries: GetDocumentQuery         │   │
│  │  - Events: DocumentIndexedEvent      │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  Extraction Module                   │   │
│  │  - Commands: ExtractEntitiesCommand  │   │
│  │  - Queries: FindPersonsQuery         │   │
│  │  - Events: EntitiesExtractedEvent    │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  Knowledge Module                    │   │
│  │  - Queries: SearchEventsQuery        │   │
│  │  - Queries: GetPersonQuery           │   │
│  │  - Queries: FindRelationsQuery       │   │
│  └──────────────────────────────────────┘   │
└────────┬─────────────────────────────────────┘
         │
         │ Prisma ORM
         │
┌────────▼────────┐
│   SQLite DB     │ (Metadata & Extracted Data)
└─────────────────┘
```

#### CQRS Integration

- **Commands (Write Operations):**
  - Index Markdown files from file system
  - Extract entities using AI (OpenAI API)
  - Update document metadata
  
- **Queries (Read Operations):**
  - Retrieve document metadata
  - Search for Persons, Events
  - Query relationships between entities
  - Full-text search capabilities

- **Events (Cross-Module Communication):**
  - `DocumentIndexedEvent`: Triggered after a document is indexed
  - `EntitiesExtractedEvent`: Triggered after AI extraction completes
  - Used to decouple modules and enable async processing

#### File System Integration

- Documents are stored in a configurable directory (e.g., `~/documents` or `./content`)
- File paths are stored in the database as relative paths from the base directory
- File operations (read/write) are handled through a dedicated service/interface
- File watchers can be implemented later for auto-indexing

### 2. Prisma Schema Draft

```prisma
// Prisma schema draft for History Organizer

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// Document represents a Markdown file in the file system
model Document {
  id            String   @id @default(uuid())
  filePath      String   @unique // Relative path from base directory
  fileName      String
  title         String?  // Extracted from frontmatter or first heading
  contentHash   String   // SHA-256 hash of file content
  lastModified  DateTime // File system last modified timestamp
  indexedAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relationships
  events        Event[]
  persons       PersonDocument[]
  
  @@index([filePath])
  @@index([lastModified])
  @@index([indexedAt])
}

// Event represents a historical event extracted from documents
model Event {
  id          String   @id @default(uuid())
  title       String
  description String?  // Extracted description/context
  dateStart   DateTime? // Start date of the event
  dateEnd     DateTime? // End date (for events spanning time)
  dateType    String?  // e.g., "exact", "approximate", "decade"
  location    String?
  
  // Relationships
  documentId  String
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  relatedPersons PersonEvent[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([documentId])
  @@index([dateStart])
  @@index([title])
}

// Person represents a historical person extracted from documents
model Person {
  id          String   @id @default(uuid())
  fullName    String
  firstName   String?
  lastName    String?
  title       String?  // e.g., "King", "General", "Philosopher"
  birthDate   DateTime?
  deathDate   DateTime?
  description String?  // Extracted context/biography
  
  // Relationships
  documents   PersonDocument[]
  events      PersonEvent[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([fullName])
  @@index([lastName])
}

// Junction table: Person <-> Document (many-to-many)
model PersonDocument {
  id         String   @id @default(uuid())
  personId   String
  person     Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
  documentId String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  context    String?  // Snippet of text where person was mentioned
  
  createdAt  DateTime @default(now())
  
  @@unique([personId, documentId])
  @@index([personId])
  @@index([documentId])
}

// Junction table: Person <-> Event (many-to-many)
model PersonEvent {
  id       String   @id @default(uuid())
  personId String
  person   Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
  eventId  String
  event    Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  role     String?  // e.g., "participant", "organizer", "victim"
  context  String?  // Snippet of text describing the relationship
  
  createdAt DateTime @default(now())
  
  @@unique([personId, eventId])
  @@index([personId])
  @@index([eventId])
}
```

#### Schema Notes

- **Document.filePath**: Stores relative path from a configurable base directory (env var)
- **Content Hash**: Used to detect file changes without re-reading content
- **Soft Deletes**: Not included initially, can be added later via `deletedAt` field
- **Indexes**: Added on frequently queried fields (filePath, dates, names)
- **Cascade Deletes**: Ensures referential integrity when documents are removed

### 3. Module Structure

Following NestJS CQRS pattern as defined in `.cursorrules`:

```
src/
├── modules/
│   ├── ingestion/
│   │   ├── commands/
│   │   │   ├── impl/
│   │   │   │   ├── index-document.command.ts
│   │   │   │   └── update-document.command.ts
│   │   │   └── handlers/
│   │   │       ├── index-document.handler.ts
│   │   │       └── update-document.handler.ts
│   │   ├── queries/
│   │   │   ├── impl/
│   │   │   │   ├── get-document.query.ts
│   │   │   │   └── list-documents.query.ts
│   │   │   └── handlers/
│   │   │       ├── get-document.handler.ts
│   │   │       └── list-documents.handler.ts
│   │   ├── events/
│   │   │   ├── impl/
│   │   │   │   └── document-indexed.event.ts
│   │   │   └── handlers/
│   │   │       └── document-indexed.handler.ts
│   │   ├── domain/
│   │   │   └── document.entity.ts
│   │   ├── dto/
│   │   │   ├── index-document.dto.ts
│   │   │   └── document-response.dto.ts
│   │   ├── ingestion.controller.ts
│   │   ├── ingestion.module.ts
│   │   └── __tests__/
│   │
│   ├── extraction/
│   │   ├── commands/
│   │   │   ├── impl/
│   │   │   │   └── extract-entities.command.ts
│   │   │   └── handlers/
│   │   │       └── extract-entities.handler.ts
│   │   ├── queries/
│   │   │   ├── impl/
│   │   │   │   └── get-extraction-status.query.ts
│   │   │   └── handlers/
│   │   │       └── get-extraction-status.handler.ts
│   │   ├── events/
│   │   │   ├── impl/
│   │   │   │   └── entities-extracted.event.ts
│   │   │   └── handlers/
│   │   │       └── entities-extracted.handler.ts
│   │   ├── domain/
│   │   │   ├── extractor.interface.ts
│   │   │   └── openai-extractor.service.ts
│   │   ├── dto/
│   │   │   └── extraction-request.dto.ts
│   │   ├── extraction.controller.ts
│   │   ├── extraction.module.ts
│   │   └── __tests__/
│   │
│   └── knowledge/
│       ├── commands/
│       │   └── (none - read-only module)
│       ├── queries/
│       │   ├── impl/
│       │   │   ├── search-events.query.ts
│       │   │   ├── get-person.query.ts
│       │   │   ├── find-relations.query.ts
│       │   │   └── search-persons.query.ts
│       │   └── handlers/
│       │       ├── search-events.handler.ts
│       │       ├── get-person.handler.ts
│       │       ├── find-relations.handler.ts
│       │       └── search-persons.handler.ts
│       ├── events/
│       │   └── (consumes events from other modules)
│       ├── domain/
│       │   ├── person.entity.ts
│       │   └── event.entity.ts
│       ├── dto/
│       │   ├── person-response.dto.ts
│       │   ├── event-response.dto.ts
│       │   └── search-query.dto.ts
│       ├── knowledge.controller.ts
│       ├── knowledge.module.ts
│       └── __tests__/
│
├── shared/
│   ├── infrastructure/
│   │   ├── file-system/
│   │   │   ├── file-system.service.ts
│   │   │   └── file-system.interface.ts
│   │   └── database/
│   │       └── prisma.service.ts
│   ├── exceptions/
│   │   ├── document-not-found.exception.ts
│   │   └── extraction-failed.exception.ts
│   └── utils/
│       ├── hash.util.ts
│       └── date-parser.util.ts
│
└── app.module.ts
```

#### Module Responsibilities

**Ingestion Module:**
- Index Markdown files from file system
- Track document metadata (path, hash, modified date)
- Emit `DocumentIndexedEvent` after successful indexing
- Provide queries to retrieve document information

**Extraction Module:**
- Listen to `DocumentIndexedEvent`
- Extract entities (Persons, Events) using OpenAI API
- Store extracted data in database
- Emit `EntitiesExtractedEvent` after extraction
- Handle extraction failures and retries

**Knowledge Module:**
- Read-only module for querying extracted knowledge
- Search and filter Persons and Events
- Query relationships between entities
- Provide aggregated views (e.g., timeline, person timeline)

### 4. Testing Strategy

Following TDD principles and `.cursorrules` testing guidelines:

#### Backend Testing (Jest)

**Unit Tests:**
- **Command Handlers**: Test business logic, validation, event emission
  - Example: `IndexDocumentCommand` should calculate content hash correctly
  - Example: `IndexDocumentCommand` should emit `DocumentIndexedEvent`
  - Example: `ExtractEntitiesCommand` should handle OpenAI API failures gracefully
  
- **Query Handlers**: Test data retrieval and filtering logic
  - Example: `SearchEventsQuery` should filter by date range correctly
  - Example: `GetPersonQuery` should include related events and documents
  
- **Domain Logic**: Test business rules and invariants
  - Example: Document entity should validate file path format
  - Example: Event entity should validate date ranges (start <= end)

- **Services**: Test file system operations and AI extraction
  - Example: `FileSystemService` should read Markdown files correctly
  - Example: `OpenAIExtractorService` should parse AI responses correctly

**E2E Tests (Supertest):**
- Test complete HTTP request/response cycles
- Use in-memory SQLite database for testing
- Test file system operations with temporary directories
- Mock OpenAI API calls in E2E tests
- Example: `POST /ingestion/documents` should index a file and return 201
- Example: `GET /knowledge/persons` should return paginated results
- Example: `POST /extraction/extract/:documentId` should trigger extraction

**Test Coverage Requirements:**
- **Commands/Queries**: 100% coverage (critical paths)
- **Domain Logic**: 100% coverage
- **Overall**: Minimum 80% coverage
- Focus on behavior, not implementation details

#### Frontend Testing (Vitest + Playwright)

**Unit Tests (Vitest + Testing Library):**
- Test React components from user perspective
- Mock API calls, not internal component methods
- Test user interactions (clicks, form submissions)
- Test loading, error, and success states
- Example: DocumentList should display documents when loaded
- Example: SearchForm should submit search query on button click

**E2E Tests (Playwright):**
- Test critical user journeys end-to-end
- Test across different browsers (Chromium, Firefox, WebKit)
- Test real workflows:
  - Upload/index a Markdown file
  - Search for a person
  - View person details with related events
  - Filter events by date range

**Test Coverage Requirements:**
- **Critical UI flows**: 100% coverage (Playwright)
- **Components**: Minimum 80% coverage (Vitest)
- Focus on user behavior, not implementation

#### Test Organization

- Co-locate tests with code (`.spec.ts` or `__tests__/` folders)
- Use descriptive test names that describe behavior
- One assertion per test when practical
- Tests must be independent (no shared state)
- Fast unit tests (< 100ms each)
- Deterministic tests (no flaky tests)

### 5. Technology Stack Details

#### Backend Dependencies (Initial)
- `@nestjs/core`, `@nestjs/common`
- `@nestjs/cqrs` (CQRS pattern)
- `@prisma/client` (Prisma ORM client)
- `prisma` (Prisma CLI)
- `@nestjs/config` (Configuration management)
- `@nestjs/swagger` (API documentation)
- `class-validator`, `class-transformer` (DTO validation)
- `openai` (OpenAI API client)
- `jest`, `@nestjs/testing`, `supertest` (Testing)

#### Frontend Dependencies (Initial)
- `react`, `react-dom`
- `vite` (Build tool)
- `@vitejs/plugin-react`
- `typescript`
- `vitest`, `@testing-library/react`, `@testing-library/jest-dom` (Testing)
- `@playwright/test` (E2E testing)
- `tailwindcss` (Styling)

#### Configuration Files Required
- `package.json` (Backend)
- `package.json` (Frontend)
- `tsconfig.json` (Both, with strict mode)
- `prisma/schema.prisma`
- `.env` (Environment variables)
- `jest.config.js` (Backend tests)
- `vitest.config.ts` (Frontend tests)
- `playwright.config.ts` (E2E tests)

### 6. Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"

# File System
DOCUMENTS_BASE_PATH="./content"

# OpenAI API
OPENAI_API_KEY="your-api-key-here"
OPENAI_MODEL="gpt-4" # or gpt-3.5-turbo

# Application
NODE_ENV="development"
PORT=3000

# Frontend
VITE_API_URL="http://localhost:3000/api"
```

### 7. Implementation Phases

1. **Phase 1: Project Setup**
   - Initialize NestJS backend
   - Initialize React + Vite frontend
   - Set up Prisma with SQLite
   - Configure testing frameworks

2. **Phase 2: Ingestion Module**
   - Implement file system service
   - Implement Document indexing commands/queries
   - Set up database schema and migrations

3. **Phase 3: Extraction Module**
   - Implement OpenAI integration
   - Implement entity extraction logic
   - Set up event handlers

4. **Phase 4: Knowledge Module**
   - Implement query handlers
   - Set up API endpoints
   - Implement search and filtering

5. **Phase 5: Frontend**
   - Build UI components
   - Integrate with backend API
   - Implement user workflows

## Acceptance Criteria

- [ ] Project structure follows CQRS pattern as defined
- [ ] Prisma schema matches the draft specification
- [ ] All modules follow the defined structure
- [ ] Testing strategy is implemented (Jest + Vitest + Playwright)
- [ ] Environment variables are properly configured
- [ ] TypeScript strict mode is enabled
- [ ] Code follows `.cursorrules` guidelines

## Notes

- This is a **DRAFT** requirement. Do not start implementation until status is changed to `APPLIED`.
- The Prisma schema is subject to refinement based on actual usage patterns.
- OpenAI API usage should be monitored for costs and rate limits.
- File system operations should handle edge cases (missing files, permissions, etc.).
- Consider implementing file watching for auto-indexing in future iterations.

## Related Requirements

None (this is the first requirement).
