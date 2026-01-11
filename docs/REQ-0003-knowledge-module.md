# REQ-0003: Knowledge Module

**Status:** `APPLIED`  
**Created:** 2025-01-27  
**UUID:** 0003  
**Name:** Knowledge Module

## Overview

This requirement defines the Knowledge Module, which implements the Read-side of the CQRS architecture. The module provides query capabilities for searching and retrieving historical data (Persons, Events) extracted from documents.

## Requirements

### 1. Module Architecture

The Knowledge Module is **Read-Only** and follows the CQRS Query pattern:

```
┌─────────────────────┐
│ Knowledge Module    │
│  (Read-Only)        │
│  ┌───────────────┐  │
│  │ Queries:      │  │
│  │ - GetPerson   │  │
│  │ - GetEvent    │  │
│  │ - SearchAll   │  │
│  │ - GetTimeline │  │
│  └───────┬───────┘  │
│          │           │
│          │ Uses      │
│          │           │
│  ┌───────▼───────┐  │
│  │ PrismaService │  │
│  │ (Read Only)   │  │
│  └───────┬───────┘  │
│          │           │
│          │ Queries   │
│          │           │
┌──────────▼───────────┐
│   SQLite Database    │
│  (Person, Event)     │
└──────────────────────┘
```

### 2. Read Model: Queries

#### 2.1 GetPersonQuery

**Purpose:** Retrieve a Person by ID with related Events and Documents.

**Input:**
- `personId: string` (required)

**Output:**
- `PersonResponseDto` containing:
  - Person details (id, fullName, firstName, lastName, title, birthDate, deathDate, description)
  - Related Events (with role and context from PersonEvent)
  - Related Documents (with context from PersonDocument)

**Query Logic:**
- Use Prisma `include` to fetch related Events and Documents
- Include PersonEvent relationships with role and context
- Include PersonDocument relationships with context

#### 2.2 GetEventQuery

**Purpose:** Retrieve an Event by ID with related Persons and Document.

**Input:**
- `eventId: string` (required)

**Output:**
- `EventResponseDto` containing:
  - Event details (id, title, description, dateStart, dateEnd, dateType, location)
  - Related Persons (with role and context from PersonEvent)
  - Document information (id, filePath, fileName, title)

**Query Logic:**
- Use Prisma `include` to fetch related Persons and Document
- Include PersonEvent relationships with role and context

#### 2.3 SearchEverythingQuery

**Purpose:** Full-text search across Persons and Events.

**Input:**
- `query: string` (required) - Search term
- `limit?: number` (optional, default: 20)
- `offset?: number` (optional, default: 0)

**Output:**
- `SearchResultDto` containing:
  - `persons: PersonResponseDto[]` - Matching persons
  - `events: EventResponseDto[]` - Matching events
  - `totalPersons: number` - Total count of matching persons
  - `totalEvents: number` - Total count of matching events

**Query Logic:**
- Search in Person fields: fullName, firstName, lastName, title, description
- Search in Event fields: title, description, location
- Use SQLite LIKE operator for pattern matching (case-insensitive)
- Return paginated results

#### 2.4 GetTimelineQuery

**Purpose:** Retrieve Events within a date range, ordered chronologically.

**Input:**
- `dateStart?: Date` (optional) - Start of date range
- `dateEnd?: Date` (optional) - End of date range
- `limit?: number` (optional, default: 50)
- `offset?: number` (optional, default: 0)

**Output:**
- `TimelineEventDto[]` containing:
  - Event details (id, title, description, dateStart, dateEnd, dateType, location)
  - Related Persons (names only, for display)
  - Document reference (filePath, fileName)

**Query Logic:**
- Filter Events by `dateStart` field within the specified range
- If `dateStart` not provided, use all events
- If `dateEnd` not provided, use all events after `dateStart`
- Order by `dateStart` ASC (oldest first)
- Include related Persons (names only for performance)
- Include Document reference

### 3. Database Schema Contract

The Knowledge Module **only** relies on the database schema:

- `Person` model
- `Event` model
- `Document` model
- `PersonEvent` junction table
- `PersonDocument` junction table

**No dependencies on Phase 3 (Extraction Module) logic.**

### 4. Module Structure

```
src/modules/knowledge/
├── queries/
│   ├── impl/
│   │   ├── get-person.query.ts
│   │   ├── get-event.query.ts
│   │   ├── search-everything.query.ts
│   │   └── get-timeline.query.ts
│   └── handlers/
│       ├── get-person.handler.ts
│       ├── get-event.handler.ts
│       ├── search-everything.handler.ts
│       └── get-timeline.handler.ts
├── dto/
│   ├── person-response.dto.ts
│   ├── event-response.dto.ts
│   ├── timeline-event.dto.ts
│   └── search-result.dto.ts
├── knowledge.controller.ts
├── knowledge.module.ts
└── __tests__/
    ├── get-person.handler.spec.ts
    ├── get-event.handler.spec.ts
    ├── search-everything.handler.spec.ts
    ├── get-timeline.handler.spec.ts
    └── knowledge.controller.spec.ts
```

### 5. DTOs

#### PersonResponseDto
```typescript
{
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  birthDate?: Date;
  deathDate?: Date;
  description?: string;
  events: Array<{
    id: string;
    title: string;
    dateStart?: Date;
    role?: string;
    context?: string;
  }>;
  documents: Array<{
    id: string;
    filePath: string;
    fileName: string;
    context?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
```

#### EventResponseDto
```typescript
{
  id: string;
  title: string;
  description?: string;
  dateStart?: Date;
  dateEnd?: Date;
  dateType?: string;
  location?: string;
  document: {
    id: string;
    filePath: string;
    fileName: string;
    title?: string;
  };
  persons: Array<{
    id: string;
    fullName: string;
    role?: string;
    context?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
```

#### TimelineEventDto
```typescript
{
  id: string;
  title: string;
  description?: string;
  dateStart?: Date;
  dateEnd?: Date;
  dateType?: string;
  location?: string;
  persons: string[]; // Array of person fullNames
  document: {
    filePath: string;
    fileName: string;
  };
}
```

#### SearchResultDto
```typescript
{
  persons: PersonResponseDto[];
  events: EventResponseDto[];
  totalPersons: number;
  totalEvents: number;
}
```

### 6. Controller Endpoints

#### GET /knowledge/persons/:id
- **Query:** `GetPersonQuery`
- **Response:** `PersonResponseDto`
- **Status Codes:** 200 (success), 404 (not found)

#### GET /knowledge/events/:id
- **Query:** `GetEventQuery`
- **Response:** `EventResponseDto`
- **Status Codes:** 200 (success), 404 (not found)

#### GET /knowledge/search
- **Query:** `SearchEverythingQuery`
- **Query Params:** `q` (search term), `limit?`, `offset?`
- **Response:** `SearchResultDto`
- **Status Codes:** 200 (success)

#### GET /knowledge/timeline
- **Query:** `GetTimelineQuery`
- **Query Params:** `dateStart?` (ISO date), `dateEnd?` (ISO date), `limit?`, `offset?`
- **Response:** `TimelineEventDto[]`
- **Status Codes:** 200 (success)

### 7. Testing Requirements

#### Test Strategy

Since Phase 3 (Extraction Module) is parallel, **tests must seed their own data**:

1. **Setup:** Create test data directly via Prisma
   - Create Document(s)
   - Create Person(s)
   - Create Event(s)
   - Create PersonEvent relationships
   - Create PersonDocument relationships

2. **Execute:** Run Query via QueryBus

3. **Assert:** Verify results match expected data

4. **Teardown:** Clean up test data (or use transactions)

#### Unit Tests

**GetPersonHandler:**
- Should return person with related events and documents
- Should return 404 if person not found
- Should include PersonEvent relationships with role and context
- Should include PersonDocument relationships with context

**GetEventHandler:**
- Should return event with related persons and document
- Should return 404 if event not found
- Should include PersonEvent relationships with role and context

**SearchEverythingHandler:**
- Should search in person fields (fullName, firstName, lastName, title, description)
- Should search in event fields (title, description, location)
- Should return paginated results
- Should handle empty search query
- Should be case-insensitive

**GetTimelineHandler:**
- Should return events ordered by dateStart ASC
- Should filter by dateStart range when provided
- Should include related persons (names only)
- Should include document reference
- Should handle events without dateStart

#### Integration Tests (Controller)

**KnowledgeController:**
- `GET /knowledge/persons/:id` should return person data
- `GET /knowledge/persons/:id` should return 404 for non-existent person
- `GET /knowledge/events/:id` should return event data
- `GET /knowledge/events/:id` should return 404 for non-existent event
- `GET /knowledge/search?q=term` should return matching persons and events
- `GET /knowledge/timeline` should return events in chronological order
- `GET /knowledge/timeline?dateStart=...&dateEnd=...` should filter by date range

### 8. Performance Considerations

- **Efficient Prisma Queries:** Use `include` for relations, avoid N+1 queries
- **Indexes:** Leverage existing indexes on Person.fullName, Event.dateStart, Event.title
- **Pagination:** Always implement pagination for list queries
- **Selective Fields:** For timeline, only fetch necessary fields (names, not full person objects)

### 9. Error Handling

- **Not Found:** Return 404 with appropriate message
- **Invalid Date Range:** Validate dateStart <= dateEnd
- **Invalid Query:** Return 400 for invalid query parameters
- **Database Errors:** Log and return 500 with generic message

### 10. Dependencies

- `@nestjs/cqrs` for CQRS Query pattern
- `@prisma/client` for database queries
- `@nestjs/swagger` for API documentation
- `class-validator`, `class-transformer` for DTO validation

## Acceptance Criteria

- [x] Documentation created and marked as APPLIED
- [ ] KnowledgeModule created with proper structure
- [ ] GetPersonQuery and Handler implemented
- [ ] GetEventQuery and Handler implemented
- [ ] SearchEverythingQuery and Handler implemented
- [ ] GetTimelineQuery and Handler implemented
- [ ] All DTOs created with proper types
- [ ] KnowledgeController with all endpoints
- [ ] Unit tests for all handlers (with seeded data)
- [ ] Integration tests for controller
- [ ] All tests passing
- [ ] Swagger documentation for all endpoints

## Implementation Notes

- **Read-Only Module:** No Commands in this module, only Queries
- **Database Contract:** Only rely on Prisma schema, not Phase 3 logic
- **Test Data:** Tests must create their own data via Prisma
- **Type Safety:** All DTOs must be strictly typed
- **Efficient Queries:** Use Prisma `include` to avoid N+1 queries
- **Swagger:** All endpoints must have `@ApiOperation` and `@ApiResponse` decorators

## Related Requirements

- **REQ-0001**: Project Initialization (defines overall architecture)
- **REQ-0002**: Extraction Module (writes data that this module reads)
