# REQ-0019: Knowledge Module Architecture Simplification (Service Pattern)

| Field | Value |
|-------|-------|
| **Status** | `TODO` |
| **Priority** | High |
| **Complexity** | Medium |
| **Estimated Effort** | 3-4 hours |
| **Dependencies** | REQ-0016 (Enhanced DTO Validation) |
| **Affects** | Knowledge module architecture |

---

## 1. Overview

Refactor the `knowledge` module to use the **Service Pattern** (KnowledgeService + KnowledgeController) instead of CQRS. This aligns with the project's "Pragmatic Modular Design" rule, which favors standard Controller-Service-Repository flow for most features.

## 2. Objectives

- Create `KnowledgeService` to house all business logic for persons and events.
- Refactor `KnowledgeController` to call `KnowledgeService` directly.
- Remove all Command, Query, and Handler classes from the `knowledge` module.
- Simplify `KnowledgeModule` by removing `CqrsModule` and handler registrations.
- Maintain 100% test coverage by updating existing tests to target the new service.

## 3. Technical Specification

### 3.1 Target Structure

```
backend/src/modules/knowledge/
├── knowledge.module.ts
├── knowledge.controller.ts
├── knowledge.service.ts         # New: Combined logic from all handlers
├── domain/
│   └── person-enrichment.service.ts
├── dto/                         # Existing DTOs
└── utils/                       # Existing utils
```

### 3.2 Refactoring Mapping

| Current CQRS Item | New Service Method |
|-------------------|-------------------|
| `CreatePersonCommand` | `createPerson()` |
| `UpdatePersonCommand` | `updatePerson()` |
| `DeletePersonCommand` | `deletePerson()` |
| `GetPersonQuery` | `getPerson()` |
| `CreateEventCommand` | `createEvent()` |
| `UpdateEventCommand` | `updateEvent()` |
| `DeleteEventCommand` | `deleteEvent()` |
| `GetEventQuery` | `getEvent()` |
| `SearchEverythingQuery` | `search()` |
| `GetTimelineQuery` | `getTimeline()` |

## 4. Acceptance Criteria

- [ ] `KnowledgeService` implemented with all methods from handlers.
- [ ] `KnowledgeController` updated to use `KnowledgeService`.
- [ ] `KnowledgeModule` simplified (no CQRS).
- [ ] All `commands/`, `queries/`, and `handlers/` directories removed from `knowledge` module.
- [ ] All unit and E2E tests pass.
- [ ] `REQUIREMENTS-STATUS.md` updated.

## 5. Testing Strategy

- **Unit Tests:** Create `knowledge.service.spec.ts` by migrating logic from existing handler tests.
- **E2E Tests:** Run `knowledge.controller.spec.ts` (which is already an E2E-style test) to ensure API behavior remains unchanged.
