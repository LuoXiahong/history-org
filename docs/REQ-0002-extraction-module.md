# REQ-0002: Extraction Module

**Status:** `APPLIED`  
**Created:** 2025-01-27  
**UUID:** 0002  
**Name:** Extraction Module

## Overview

This requirement defines the Extraction Module that processes indexed documents using AI (OpenAI) to extract structured historical entities (Persons and Events) from Markdown content.

## Requirements

### 1. Module Architecture

The Extraction Module follows the CQRS pattern and listens to events from the Ingestion Module:

```
┌─────────────────────┐
│ Ingestion Module    │
│  IndexDocumentCmd   │
└──────────┬──────────┘
           │
           │ Emits DocumentIndexedEvent
           │
┌──────────▼──────────────────────────┐
│ Extraction Module                   │
│  ┌──────────────────────────────┐   │
│  │ DocumentIndexedHandler       │   │
│  │ (listens to event)           │   │
│  └──────────┬───────────────────┘   │
│             │                        │
│             │ Triggers               │
│             │                        │
│  ┌──────────▼───────────────────┐   │
│  │ ExtractEntitiesCommand       │   │
│  └──────────┬───────────────────┘   │
│             │                        │
│             │ Uses                   │
│             │                        │
│  ┌──────────▼───────────────────┐   │
│  │ OpenAIExtractorService       │   │
│  │ - Calls OpenAI API           │   │
│  │ - Parses JSON response       │   │
│  └──────────┬───────────────────┘   │
│             │                        │
│             │ Saves to DB            │
│             │                        │
│  ┌──────────▼───────────────────┐   │
│  │ ExtractEntitiesHandler       │   │
│  │ - Saves Persons              │   │
│  │ - Saves Events               │   │
│  │ - Creates relationships      │   │
│  └──────────┬───────────────────┘   │
│             │                        │
│             │ Emits                  │
│             │                        │
│  ┌──────────▼───────────────────┐   │
│  │ EntitiesExtractedEvent       │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 2. Event-Driven Flow

**Input:**
- `DocumentIndexedEvent` (from Ingestion Module)
  - `documentId: string`
  - `filePath: string`

**Process:**
1. Event Handler receives `DocumentIndexedEvent`
2. Reads document content from file system using `FileSystemService`
3. Sends document content to OpenAI API via `OpenAIExtractorService`
4. OpenAI returns structured JSON with Persons and Events
5. Command Handler saves extracted entities to database
6. Creates relationships (PersonDocument, PersonEvent)
7. Emits `EntitiesExtractedEvent`

**Output:**
- `EntitiesExtractedEvent`
  - `documentId: string`
  - `personCount: number`
  - `eventCount: number`

### 3. OpenAI Extraction Logic

#### Input Format
- Plain Markdown text content from document

#### Prompt Structure
The system prompt should instruct the model to:
- Extract historical persons with: fullName, firstName, lastName, title, birthDate, deathDate, description
- Extract historical events with: title, description, dateStart, dateEnd, dateType, location
- Identify relationships between persons and events
- Return structured JSON matching Prisma schema

#### Output Format (JSON)
```json
{
  "persons": [
    {
      "fullName": "Napoleon Bonaparte",
      "firstName": "Napoleon",
      "lastName": "Bonaparte",
      "title": "Emperor",
      "birthDate": "1769-08-15",
      "deathDate": "1821-05-05",
      "description": "French military and political leader"
    }
  ],
  "events": [
    {
      "title": "Battle of Waterloo",
      "description": "Final defeat of Napoleon",
      "dateStart": "1815-06-18",
      "dateEnd": null,
      "dateType": "exact",
      "location": "Waterloo, Belgium",
      "relatedPersonNames": ["Napoleon Bonaparte", "Duke of Wellington"]
    }
  ]
}
```

### 4. Database Operations

#### Person Extraction
- Check if Person already exists (by fullName)
- If exists: Use existing Person
- If not: Create new Person
- Create PersonDocument relationship with context snippet

#### Event Extraction
- Always create new Event (events are document-specific)
- Link Event to Document via `documentId`
- For each person mentioned in event:
  - Find or create Person
  - Create PersonEvent relationship with role and context

#### Transaction Handling
- Use database transactions to ensure atomicity
- If extraction fails, rollback all changes
- Handle partial failures gracefully

### 5. Error Handling

#### OpenAI API Errors
- Rate limiting: Implement retry with exponential backoff
- Invalid response format: Log error and return empty result
- API failures: Emit error event, don't crash the system
- Timeout: Set reasonable timeout (30-60 seconds)

#### Database Errors
- Constraint violations: Log and skip duplicate entries
- Transaction failures: Rollback and emit error event
- Connection errors: Retry with backoff

#### File System Errors
- Document not found: Skip extraction, log warning
- Read errors: Emit error event

### 6. Module Structure

```
src/modules/extraction/
├── commands/
│   ├── impl/
│   │   └── extract-entities.command.ts
│   └── handlers/
│       └── extract-entities.handler.ts
├── events/
│   ├── impl/
│   │   └── entities-extracted.event.ts
│   └── handlers/
│       └── document-indexed.handler.ts (listens to Ingestion event)
├── domain/
│   └── openai-extractor.service.ts
├── dto/
│   ├── extraction-request.dto.ts
│   └── extraction-response.dto.ts
├── extraction.controller.ts
├── extraction.module.ts
└── __tests__/
    ├── openai-extractor.service.spec.ts
    ├── extract-entities.handler.spec.ts
    └── document-indexed.handler.spec.ts
```

### 7. Configuration

#### Environment Variables
```env
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=gpt-4  # or gpt-3.5-turbo
OPENAI_TEMPERATURE=0.3  # Lower temperature for structured output
OPENAI_MAX_TOKENS=4000  # Sufficient for extraction response
```

#### Service Configuration
- Model selection: Configurable via env var (default: gpt-4)
- Temperature: Low (0.3) for consistent structured output
- Max tokens: 4000 for extraction response
- Timeout: 60 seconds

### 8. Testing Requirements

#### Unit Tests

**OpenAIExtractorService:**
- Should call OpenAI API with correct prompt
- Should parse valid JSON response correctly
- Should handle invalid JSON response gracefully
- Should handle API errors (rate limit, timeout, etc.)
- Should retry on transient failures

**ExtractEntitiesHandler:**
- Should save Persons to database
- Should save Events to database
- Should create PersonDocument relationships
- Should create PersonEvent relationships
- Should handle duplicate Persons (use existing)
- Should handle transaction rollback on error
- Should emit EntitiesExtractedEvent on success

**DocumentIndexedHandler:**
- Should trigger ExtractEntitiesCommand when event received
- Should read document content from file system
- Should handle file not found errors
- Should not crash on invalid content

#### Integration Tests
- Should extract entities from sample Markdown content
- Should persist entities to database correctly
- Should maintain referential integrity

### 9. Performance Considerations

- **Async Processing**: Event-driven architecture ensures non-blocking extraction
- **Batch Processing**: Future enhancement: batch multiple documents
- **Caching**: Future enhancement: cache extraction results by content hash
- **Rate Limiting**: Respect OpenAI rate limits with exponential backoff
- **Cost Management**: Monitor token usage and costs

### 10. Dependencies

- `openai` package (already installed)
- `@nestjs/cqrs` for CQRS pattern
- `@nestjs/config` for configuration
- `@prisma/client` for database operations
- `FileSystemService` (from shared infrastructure)

## Acceptance Criteria

- [x] Documentation created and marked as APPLIED
- [ ] OpenAI package installed and configured
- [ ] ExtractionModule created with proper structure
- [ ] OpenAIExtractorService implemented
- [ ] ExtractEntitiesCommand and Handler implemented
- [ ] DocumentIndexedHandler listens to Ingestion events
- [ ] EntitiesExtractedEvent implemented and emitted
- [ ] Unit tests for OpenAIExtractorService (mocked OpenAI)
- [ ] Unit tests for ExtractEntitiesHandler
- [ ] All tests passing
- [ ] Integration with Ingestion Module verified

## Implementation Notes

- **Event Handler Location**: The `DocumentIndexedHandler` that triggers extraction should be in the Extraction Module, not the Ingestion Module. This follows the principle that modules consume events they care about.
- **Content Reading**: The handler needs to read document content. It should use `FileSystemService` to read the file based on the `filePath` from the event.
- **Idempotency**: Extraction should be idempotent. If entities already exist, update them rather than creating duplicates.
- **Logging**: Add comprehensive logging for debugging extraction issues.

## Related Requirements

- **REQ-0001**: Project Initialization (defines overall architecture)
- **Phase 2**: Ingestion Module (emits DocumentIndexedEvent)
