# REQ-0006: Frontend Timeline Feature

**Status:** `APPLIED`  
**Created:** 2026-01-11  
**UUID:** 0006  
**Name:** Frontend Timeline Feature

## Overview

This requirement defines the frontend implementation for the Timeline feature, providing a visual chronological view of historical events extracted from documents.

## Requirements

### 1. UI Design

#### 1.1 Visual Layout
- **Vertical Timeline**: Clean vertical line design using Tailwind CSS
- **Event Points**: Visual dots/indicators on the timeline axis
- **Year Grouping**: Events grouped by year with year headers
- **Date Display**: Clear date display on the left/axis side
- **Event Cards**: Clickable cards showing event details

#### 1.2 User Interface
```
┌─────────────────────────────────────────┐
│         Timeline View                    │
│                                         │
│  [Date Start: _____] [Date End: _____] │
│  [Filter Timeline]                      │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 2024                              │  │
│  │ ● ─────────────────────────────   │  │
│  │   └─ Event Card 1                │  │
│  │ ● ─────────────────────────────   │  │
│  │   └─ Event Card 2                │  │
│  │                                   │  │
│  │ 2023                              │  │
│  │ ● ─────────────────────────────   │  │
│  │   └─ Event Card 3                │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

#### 1.3 Timeline Design
- **Vertical Line**: Left border with gradient or solid color
- **Event Dots**: Colored circles/bullets on the timeline
- **Year Headers**: Bold year labels with spacing
- **Event Cards**: Clean cards with hover effects
- **Responsive**: Mobile-friendly layout

### 2. Components

#### 2.1 TimelineItem
- **Purpose**: Visual representation of a single event point on the timeline
- **Props**: Event data (TimelineEventDto)
- **Features**:
  - Event dot/indicator
  - Date display
  - Event card with title, description, location
  - Click handler for navigation/expansion

#### 2.2 TimelineList
- **Purpose**: Container handling vertical line logic and year grouping
- **Props**: Array of timeline events
- **Features**:
  - Groups events by year
  - Renders vertical timeline line (border-left)
  - Renders TimelineItem components
  - Handles empty state

#### 2.3 TimelinePage
- **Purpose**: Main page component at `/timeline` route
- **Features**:
  - Date range filters (startDate, endDate)
  - React Query integration for data fetching
  - Loading and error states
  - Renders TimelineList component

### 3. API Integration

#### 3.1 Timeline API
- **Endpoint**: `GET /knowledge/timeline`
- **Query Parameters**:
  - `dateStart?: string` (ISO 8601)
  - `dateEnd?: string` (ISO 8601)
  - `limit?: number` (default: 50)
  - `offset?: number` (default: 0)
- **Response**: `TimelineEventDto[]`

#### 3.2 TimelineEventDto Structure
```typescript
interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  dateStart?: string; // ISO 8601
  dateEnd?: string; // ISO 8601
  dateType?: string;
  location?: string;
  persons: string[]; // Array of person names
  document: {
    filePath: string;
    fileName: string;
  };
}
```

### 4. Technical Implementation

#### 4.1 File Structure
```
src/
├── features/
│   └── knowledge/
│       ├── api/
│       │   └── knowledge.api.ts (add getTimeline)
│       ├── components/
│       │   └── Timeline/
│       │       ├── TimelineItem.tsx
│       │       └── TimelineList.tsx
│       ├── pages/
│       │   └── TimelinePage.tsx
│       └── types/
│           └── index.ts (add TimelineEvent)
```

#### 4.2 Data Flow
1. User sets date filters (optional)
2. TimelinePage calls `getTimeline(params)`
3. API returns `TimelineEventDto[]`
4. TimelineList groups events by year
5. TimelineItem renders each event

#### 4.3 Year Grouping Logic
- Extract year from `dateStart` field
- Group events by year
- Sort years descending (newest first)
- Sort events within each year chronologically

### 5. Styling

#### 5.1 Tailwind CSS Classes
- **Vertical Line**: `border-l-2 border-indigo-300` or similar
- **Event Dot**: `w-3 h-3 rounded-full bg-indigo-500`
- **Year Header**: `text-xl font-bold text-gray-900`
- **Event Card**: `bg-white rounded-xl border shadow-sm hover:shadow-md`

#### 5.2 Responsive Design
- Mobile: Stack timeline vertically
- Desktop: Side-by-side timeline with event cards
- Use Tailwind responsive breakpoints

### 6. User Interactions

#### 6.1 Date Filters
- Input fields for start and end dates
- Apply filter button (or auto-apply on change)
- Clear filters option

#### 6.2 Event Cards
- Clickable (navigate to event details if available)
- Hover effect for better UX
- Show truncated description with option to expand

### 7. Error Handling

#### 7.1 States
- **Loading**: Show skeleton or spinner
- **Error**: Display error message with retry option
- **Empty**: Show "No events found" message
- **Success**: Display timeline with events

### 8. Testing Requirements

#### 8.1 Unit Tests (Vitest)
- TimelineItem: Renders event data correctly
- TimelineList: Groups events by year correctly
- TimelinePage: Filters applied correctly, data fetching works

#### 8.2 E2E Tests (Playwright)
- Timeline page loads and displays events
- Date filters work correctly
- Event cards are clickable
- Year grouping displays correctly

## Acceptance Criteria

- [x] Documentation created and marked as `APPLIED`
- [ ] TimelinePage component created with filters
- [ ] TimelineList component with year grouping
- [ ] TimelineItem component with event display
- [ ] API integration (`getTimeline` function)
- [ ] Types defined for TimelineEvent
- [ ] App.tsx updated to use TimelinePage
- [ ] Responsive design implemented
- [ ] Loading and error states handled
- [ ] Unit tests for components
- [ ] E2E tests for timeline flow

## Related Requirements

- **REQ-0003**: Knowledge Module (Backend Timeline API)
- **REQ-0004**: Frontend Foundation
- **REQ-0005**: Frontend Features (Upload & Search)
