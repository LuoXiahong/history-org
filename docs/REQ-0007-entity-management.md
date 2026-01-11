# REQ-0007: Manual Entity Management (CRUD + AI Assist)

**Status:** `APPLIED`  
**Created:** 2025-01-27  
**UUID:** 0007  
**Name:** Manual Entity Management

## Overview

This requirement implements full CRUD operations for Persons and Events, allowing users to manually add, edit, and delete entities directly. The system includes AI-assisted "Magic Fill" functionality and duplicate detection to maintain consistency with the automated extraction flow.

## Requirements

### 1. Module Architecture

The Knowledge Module is upgraded from Read-Only to Read-Write, adding Commands alongside existing Queries:

```
┌─────────────────────┐
│ Knowledge Module    │
│  (Read-Write)       │
│  ┌───────────────┐  │
│  │ Commands:     │  │
│  │ - CreatePerson│  │
│  │ - UpdatePerson│  │
│  │ - DeletePerson│  │
│  │ - CreateEvent │  │
│  │ - UpdateEvent │  │
│  │ - DeleteEvent │  │
│  └───────┬───────┘  │
│  ┌───────▼───────┐  │
│  │ Queries:      │  │
│  │ - GetPerson   │  │
│  │ - GetEvent    │  │
│  │ - SearchAll   │  │
│  └───────┬───────┘  │
│          │           │
│          │ Uses      │
│          │           │
│  ┌───────▼───────┐  │
│  │ PrismaService │  │
│  │ + AI Service  │  │
│  └───────────────┘  │
```

### 2. Commands

#### 2.1 CreatePersonCommand

**Purpose:** Create a new Person entity manually.

**Input:**
- `fullName: string` (required)
- `firstName?: string`
- `lastName?: string`
- `title?: string`
- `birthDate?: Date`
- `deathDate?: Date`
- `description?: string`

**Process:**
1. Normalize `fullName` (trim, lowercase for comparison)
2. Check for duplicate by normalized name
3. If duplicate exists, throw `ConflictException`
4. Create Person in database
5. Return created Person

**Deduplication Logic:**
- Normalize name: `fullName.trim().toLowerCase()`
- Query: `prisma.person.findFirst({ where: { fullName: { equals: normalizedName, mode: 'insensitive' } } })`
- If found, throw conflict error with existing Person ID

**Output:**
- `PersonResponseDto` (created Person)

#### 2.2 UpdatePersonCommand

**Purpose:** Update an existing Person entity.

**Input:**
- `personId: string` (required)
- `fullName?: string`
- `firstName?: string`
- `lastName?: string`
- `title?: string`
- `birthDate?: Date`
- `deathDate?: Date`
- `description?: string`

**Process:**
1. Verify Person exists (throw `NotFoundException` if not)
2. If `fullName` is being updated, check for duplicates (excluding current Person)
3. Update Person in database
4. Return updated Person

**Output:**
- `PersonResponseDto` (updated Person)

#### 2.3 DeletePersonCommand

**Purpose:** Delete a Person entity.

**Input:**
- `personId: string` (required)

**Process:**
1. Verify Person exists (throw `NotFoundException` if not)
2. Delete Person (cascade deletes PersonDocument and PersonEvent relationships)
3. Return success

**Output:**
- `void`

#### 2.4 CreateEventCommand

**Purpose:** Create a new Event entity manually.

**Input:**
- `title: string` (required)
- `description?: string`
- `dateStart?: Date`
- `dateEnd?: Date`
- `dateType?: string`
- `location?: string`
- `documentId?: string` (optional - events can exist without documents)

**Process:**
1. If `documentId` provided, verify Document exists
2. Create Event in database
3. Return created Event

**Output:**
- `EventResponseDto` (created Event)

#### 2.5 UpdateEventCommand

**Purpose:** Update an existing Event entity.

**Input:**
- `eventId: string` (required)
- `title?: string`
- `description?: string`
- `dateStart?: Date`
- `dateEnd?: Date`
- `dateType?: string`
- `location?: string`
- `documentId?: string`

**Process:**
1. Verify Event exists (throw `NotFoundException` if not)
2. If `documentId` provided, verify Document exists
3. Update Event in database
4. Return updated Event

**Output:**
- `EventResponseDto` (updated Event)

#### 2.6 DeleteEventCommand

**Purpose:** Delete an Event entity.

**Input:**
- `eventId: string` (required)

**Process:**
1. Verify Event exists (throw `NotFoundException` if not)
2. Delete Event (cascade deletes PersonEvent relationships)
3. Return success

**Output:**
- `void`

### 3. AI Enrichment Service

#### 3.1 enrichPerson Method

**Purpose:** Use OpenAI to enrich Person data from a name.

**Input:**
- `name: string` (required) - Person's full name

**Process:**
1. Send name to OpenAI with strict prompt for JSON-only response
2. Parse JSON response
3. Return structured Person data

**Prompt Structure:**
```
You are a historical data enrichment system. Given a person's name, return structured JSON with their biographical information.

Return ONLY valid JSON, no markdown, no explanations.

Return a JSON object with this structure:
{
  "fullName": "string",
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "title": "string (optional)",
  "birthDate": "YYYY-MM-DD (optional)",
  "deathDate": "YYYY-MM-DD (optional)",
  "description": "string (optional)"
}

If information is not available, use null for optional fields.
```

**Output:**
- `EnrichedPersonData` interface matching Person fields

**Error Handling:**
- If OpenAI API fails, return partial data or empty object
- Log errors but don't crash the application

### 4. API Endpoints

#### 4.1 Person Endpoints

**POST /knowledge/persons**
- Create a new Person
- Request Body: `CreatePersonDto`
- Response: `PersonResponseDto` (201 Created)

**PUT /knowledge/persons/:id**
- Update an existing Person
- Request Body: `UpdatePersonDto`
- Response: `PersonResponseDto` (200 OK)

**DELETE /knowledge/persons/:id**
- Delete a Person
- Response: 204 No Content

**POST /knowledge/persons/enrich**
- AI enrichment endpoint
- Request Body: `{ name: string }`
- Response: `EnrichedPersonData` (200 OK)

#### 4.2 Event Endpoints

**POST /knowledge/events**
- Create a new Event
- Request Body: `CreateEventDto`
- Response: `EventResponseDto` (201 Created)

**PUT /knowledge/events/:id**
- Update an existing Event
- Request Body: `UpdateEventDto`
- Response: `EventResponseDto` (200 OK)

**DELETE /knowledge/events/:id**
- Delete an Event
- Response: 204 No Content

### 5. Frontend Implementation

#### 5.1 PeoplePage

**Purpose:** Display all Persons in a data table/grid.

**Features:**
- Data table with columns: Name, Title, Birth Date, Death Date, Actions
- "Add Person" button
- "Edit" and "Delete" actions per row
- Click on row to view Person details
- Pagination support

#### 5.2 EventsPage

**Purpose:** Display all Events in a data table/grid.

**Features:**
- Data table with columns: Title, Date, Location, Document, Actions
- "Add Event" button
- "Edit" and "Delete" actions per row
- Click on row to view Event details
- Pagination support

#### 5.3 PersonForm

**Purpose:** Form for creating/editing Persons.

**Features:**
- Form fields: fullName, firstName, lastName, title, birthDate, deathDate, description
- "✨ Auto-fill with AI" button next to Name input
  - On click: Call `/knowledge/persons/enrich` with name
  - Fill form fields automatically with AI response
  - Show loading state during API call
- Validation: fullName required
- Submit button: "Create" or "Update" based on mode
- Cancel button to close modal/page

#### 5.4 Edit Flow

**PersonDetailsPage:**
- Add "Edit" button
- On click: Open PersonForm in edit mode with pre-filled data
- On save: Update Person and refresh details page

### 6. Integration

#### 6.1 Sidebar Navigation

Add new navigation items:
- "People" → `/people`
- "Events" → `/events`

#### 6.2 Search Integration

Ensure search results link to:
- Person details page: `/people/:id`
- Event details page: `/events/:id`

### 7. Module Structure

```
src/modules/knowledge/
├── commands/
│   ├── impl/
│   │   ├── create-person.command.ts
│   │   ├── update-person.command.ts
│   │   ├── delete-person.command.ts
│   │   ├── create-event.command.ts
│   │   ├── update-event.command.ts
│   │   └── delete-event.command.ts
│   └── handlers/
│       ├── create-person.handler.ts
│       ├── update-person.handler.ts
│       ├── delete-person.handler.ts
│       ├── create-event.handler.ts
│       ├── update-event.handler.ts
│       └── delete-event.handler.ts
├── queries/
│   └── (existing queries)
├── dto/
│   ├── create-person.dto.ts
│   ├── update-person.dto.ts
│   ├── create-event.dto.ts
│   ├── update-event.dto.ts
│   └── enriched-person.dto.ts
├── domain/
│   └── person-enrichment.service.ts (or extend OpenAIExtractorService)
├── knowledge.controller.ts (updated)
├── knowledge.module.ts (updated)
└── __tests__/
    ├── create-person.handler.spec.ts
    ├── update-person.handler.spec.ts
    └── (other command tests)
```

### 8. DTOs

#### CreatePersonDto
```typescript
{
  fullName: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  birthDate?: Date;
  deathDate?: Date;
  description?: string;
}
```

#### UpdatePersonDto
```typescript
{
  fullName?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  birthDate?: Date;
  deathDate?: Date;
  description?: string;
}
```

#### CreateEventDto
```typescript
{
  title: string;
  description?: string;
  dateStart?: Date;
  dateEnd?: Date;
  dateType?: string;
  location?: string;
  documentId?: string;
}
```

#### UpdateEventDto
```typescript
{
  title?: string;
  description?: string;
  dateStart?: Date;
  dateEnd?: Date;
  dateType?: string;
  location?: string;
  documentId?: string;
}
```

#### EnrichedPersonDto
```typescript
{
  fullName: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  birthDate?: string;
  deathDate?: string;
  description?: string;
}
```

### 9. Error Handling

#### Duplicate Person
- **Error:** `ConflictException`
- **Message:** "Person with name '{name}' already exists (ID: {id})"
- **HTTP Status:** 409 Conflict

#### Person/Event Not Found
- **Error:** `NotFoundException`
- **HTTP Status:** 404 Not Found

#### Invalid Document ID
- **Error:** `BadRequestException`
- **Message:** "Document with ID '{id}' not found"
- **HTTP Status:** 400 Bad Request

#### AI Enrichment Failure
- **Error:** Log error, return empty/partial data
- **HTTP Status:** 200 OK (with partial data) or 500 (if critical)

### 10. Testing Requirements

#### Unit Tests

**Command Handlers:**
- `CreatePersonHandler`: Should create Person, should reject duplicates
- `UpdatePersonHandler`: Should update Person, should reject duplicate names
- `DeletePersonHandler`: Should delete Person and cascade relationships
- `CreateEventHandler`: Should create Event
- `UpdateEventHandler`: Should update Event
- `DeleteEventHandler`: Should delete Event and cascade relationships

**AI Enrichment:**
- Should call OpenAI API with correct prompt
- Should parse JSON response correctly
- Should handle API errors gracefully

#### E2E Tests

- `POST /knowledge/persons` should create Person and return 201
- `POST /knowledge/persons` should reject duplicate names with 409
- `PUT /knowledge/persons/:id` should update Person and return 200
- `DELETE /knowledge/persons/:id` should delete Person and return 204
- `POST /knowledge/persons/enrich` should return enriched data
- Similar tests for Events

### 11. Consistency with Extraction Flow

**Critical Requirements:**
- Deduplication logic must match extraction module's logic
- Normalization must be identical (trim + lowercase)
- Person creation should be idempotent (same name = same Person)
- Events can be created without documents (for manual curation)

## Acceptance Criteria

- [x] Documentation created and marked as APPLIED
- [ ] KnowledgeModule refactored to support Commands
- [ ] All Person CRUD commands implemented
- [ ] All Event CRUD commands implemented
- [ ] Deduplication logic implemented and tested
- [ ] AI enrichment service implemented
- [ ] Controller endpoints added with Swagger documentation
- [ ] PeoplePage and EventsPage implemented
- [ ] PersonForm with AI auto-fill implemented
- [ ] Edit functionality added to PersonDetailsPage
- [ ] Sidebar navigation updated
- [ ] All tests passing (unit + E2E)
- [ ] Integration verified

## Related Requirements

- **REQ-0003**: Knowledge Module (read-only queries)
- **REQ-0002**: Extraction Module (automated entity creation)
- **REQ-0001**: Project Initialization (architecture)
