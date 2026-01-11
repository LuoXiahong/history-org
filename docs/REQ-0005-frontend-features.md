# REQ-0005: Frontend Features (Upload & Search)

**Status:** `APPLIED`  
**Created:** 2026-01-11  
**UUID:** 0005  
**Name:** Frontend Features - Upload & Search

## Overview

This requirement defines the frontend implementation for the Upload Document and Search Knowledge features, fully connected to the backend Ingestion and Knowledge modules.

## Requirements

### 1. Upload Feature

#### 1.1 UI Components
- **UploadPage**: Main page component at `/upload` route
- **FileDropzone**: Drag-and-drop file upload area with click-to-browse
- **UploadProgress**: Visual feedback for upload/processing status

#### 1.2 User Flow
```
┌─────────────────────────────────────────┐
│         Upload Document Page            │
│  ┌───────────────────────────────────┐  │
│  │    Drag & Drop Zone               │  │
│  │    ┌─────────────────────────┐    │  │
│  │    │ 📄 Drop your .md file  │    │  │
│  │    │    or click to browse   │    │  │
│  │    └─────────────────────────┘    │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Selected: napoleon.md]                │
│                                         │
│  [====== Upload & Process ======]       │
│                                         │
│  Status: Processing with AI...          │
│  ┌───────────────────────────────────┐  │
│  │ ✓ File uploaded                   │  │
│  │ ✓ Document indexed                │  │
│  │ ⏳ Extracting entities...         │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

#### 1.3 Technical Implementation
1. User selects/drops a `.md` file
2. Frontend sends file via `multipart/form-data` to `POST /api/ingestion/upload`
3. Backend receives file, saves to `DOCUMENTS_BASE_PATH`
4. Backend triggers `IndexDocumentCommand` internally
5. Indexing emits `DocumentIndexedEvent` → triggers extraction
6. Frontend receives immediate response with document ID
7. Optional: Poll for extraction status or use optimistic UI

### 2. Search Feature

#### 2.1 UI Components
- **SearchPage**: Main page component at `/search` route
- **SearchInput**: Text input with debounced search (300ms)
- **PersonCard**: Display person entity with details
- **EventCard**: Display event entity with details
- **SearchResults**: Container for search results

#### 2.2 User Flow
```
┌─────────────────────────────────────────┐
│         Search Knowledge Base           │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 🔍 Search persons, events...      │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Results for "Napoleon"                 │
│                                         │
│  PERSONS (3)                            │
│  ┌───────────────────────────────────┐  │
│  │ 👤 Napoleon Bonaparte             │  │
│  │ Emperor | 1769-1821               │  │
│  │ French military and political...  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  EVENTS (5)                             │
│  ┌───────────────────────────────────┐  │
│  │ 📅 Battle of Waterloo             │  │
│  │ 1815-06-18 | Waterloo, Belgium    │  │
│  │ Final defeat of Napoleon...       │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

#### 2.3 Technical Implementation
1. User types in search input
2. Debounce input for 300ms
3. Call `GET /api/knowledge/search?q={query}&limit=20`
4. Render results in PersonCard and EventCard components
5. Handle loading, empty, and error states

### 3. Backend Adjustments

#### 3.1 New Upload Endpoint
Add `POST /api/ingestion/upload` endpoint:
- Accept `multipart/form-data` with file field
- Validate file type (`.md` only)
- Save file to `DOCUMENTS_BASE_PATH`
- Trigger `IndexDocumentCommand` with file path
- Return document response

#### 3.2 API Contract

**Request:**
```
POST /api/ingestion/upload
Content-Type: multipart/form-data

file: <markdown-file>
```

**Response:**
```json
{
  "id": "uuid",
  "filePath": "uploads/2026-01-11-napoleon.md",
  "fileName": "napoleon.md",
  "status": "INDEXED",
  "indexedAt": "2026-01-11T10:00:00Z"
}
```

### 4. Frontend Structure

```
src/
├── features/
│   ├── ingestion/
│   │   ├── api/
│   │   │   └── ingestion.api.ts
│   │   ├── components/
│   │   │   └── FileDropzone.tsx
│   │   ├── pages/
│   │   │   └── UploadPage.tsx
│   │   └── types/
│   │       └── index.ts
│   └── knowledge/
│       ├── api/
│       │   └── knowledge.api.ts
│       ├── components/
│       │   ├── PersonCard.tsx
│       │   ├── EventCard.tsx
│       │   └── SearchInput.tsx
│       ├── pages/
│       │   └── SearchPage.tsx
│       └── types/
│           └── index.ts
```

### 5. Dependencies

#### Frontend
- `react-dropzone` - File upload with drag-and-drop

#### Backend
- `multer` (via @nestjs/platform-express) - Already included with NestJS

### 6. Testing Requirements

#### Frontend Unit Tests (Vitest)
- UploadPage: File selection, upload flow, error handling
- SearchPage: Input debouncing, results rendering
- PersonCard: Renders person data correctly
- EventCard: Renders event data correctly

#### E2E Tests (Playwright)
- Upload flow: Select file → Upload → See success
- Search flow: Type query → See results

## Acceptance Criteria

- [x] Documentation created and marked as APPLIED
- [ ] Backend upload endpoint accepts multipart/form-data
- [ ] Backend saves uploaded file to DOCUMENTS_BASE_PATH
- [ ] Frontend UploadPage with file dropzone
- [ ] Frontend SearchPage with debounced search
- [ ] PersonCard and EventCard components
- [ ] All routes integrated in App.tsx
- [ ] Unit tests for frontend components
- [ ] E2E tests for upload and search flows

## Related Requirements

- **REQ-0001**: Project Initialization
- **REQ-0002**: Extraction Module
- **REQ-0003**: Knowledge Module
- **REQ-0004**: Frontend Skeleton
