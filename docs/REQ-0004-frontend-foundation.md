# REQ-0004: Frontend Foundation

**Status:** `APPLIED`  
**Created:** 2025-01-27  
**UUID:** 0004  
**Name:** Frontend Foundation

## Overview

This requirement defines the foundational architecture for the React + Vite frontend application. The frontend provides a user interface for interacting with the History Organizer backend API (Ingestion, Extraction, and Knowledge modules).

## Requirements

### 1. Technology Stack

#### Core Technologies
- **React 19**: UI library with modern hooks
- **Vite 7**: Build tool and dev server
- **TypeScript**: Type-safe development with strict mode
- **Tailwind CSS 4**: Utility-first CSS framework
- **React Query (TanStack Query)**: Server state management and API data fetching
- **React Router DOM**: Client-side routing
- **Axios**: HTTP client for API requests
- **clsx**: Utility for conditional className composition
- **lucide-react**: Icon library

#### Development Tools
- **Vitest**: Unit testing framework
- **Testing Library**: React component testing utilities
- **Playwright**: E2E testing framework
- **ESLint**: Code linting
- **Prettier**: Code formatting

### 2. Project Structure

```
frontend/
├── src/
│   ├── features/
│   │   ├── documents/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── api/
│   │   │   ├── types/
│   │   │   └── __tests__/
│   │   └── knowledge/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── api/
│   │       ├── types/
│   │       └── __tests__/
│   ├── shared/
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   │   ├── MainLayout.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── __tests__/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── types/
│   ├── lib/
│   │   └── axios.ts              # Configured Axios instance
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   └── __tests__/
│   ├── App.tsx                   # Router setup
│   └── main.tsx                  # Entry point with QueryClientProvider
├── vite.config.ts                # Vite config with API proxy
└── package.json
```

### 3. Infrastructure Setup

#### 3.1 Vite Configuration

- **Proxy Setup**: Configure Vite dev server to proxy `/api` requests to `http://localhost:3000` (backend)
- **React Plugin**: Enable React Fast Refresh
- **Path Aliases**: Configure `@/` alias to `src/` (optional, for cleaner imports)

#### 3.2 Axios Client

- **Base URL**: `/api` (proxied to backend during development)
- **Request Interceptors**: Add authentication headers (if needed in future)
- **Response Interceptors**: Handle common errors, transform responses
- **Error Handling**: Standardized error handling for API errors

#### 3.3 React Query Setup

- **QueryClientProvider**: Wrap app in `main.tsx`
- **Default Options**: Configure default query/st mutation options
  - Stale time: 1 minute
  - Cache time: 5 minutes
  - Retry: 2 attempts on failure

### 4. UI Components

#### 4.1 Main Layout

**Components:**
- `MainLayout`: Root layout component with sidebar and content area
- `Sidebar`: Navigation sidebar with links to main features

**Sidebar Navigation:**
- Upload (documents upload/ingestion)
- Search (knowledge search)
- Timeline (temporal view of events)

**Layout Structure:**
```
┌─────────────────────────────────────┐
│  Sidebar  │  Content Area           │
│           │                          │
│  Upload   │  [Route Content]        │
│  Search   │                          │
│  Timeline │                          │
│           │                          │
└─────────────────────────────────────┘
```

#### 4.2 Dashboard Page

- Welcome message
- Statistics/overview cards (document count, entities count, etc.)
- Recent activity feed
- Quick actions

### 5. Routing

**Routes:**
- `/` - Dashboard (home)
- `/upload` - Document upload (to be implemented in future phase)
- `/search` - Knowledge search (to be implemented in future phase)
- `/timeline` - Timeline view (to be implemented in future phase)

**Router Configuration:**
- Use `BrowserRouter` for client-side routing
- Wrap routes in `MainLayout`
- Handle 404 with a Not Found page (future)

### 6. Styling

- **Tailwind CSS**: Utility-first styling
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Prepare structure for dark mode (future)
- **Component Styles**: Use Tailwind classes, avoid inline styles

### 7. Type Safety

- **TypeScript Strict Mode**: Enabled
- **API Types**: Define TypeScript interfaces matching backend DTOs
- **Component Props**: All props must be typed
- **No `any` Types**: Use `unknown` if type is truly unknown

## Implementation Details

### 7.1 Vite Proxy Configuration

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

### 7.2 Axios Client

```typescript
// src/lib/axios.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 7.3 QueryClient Setup

```typescript
// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});
```

## Acceptance Criteria

- [x] Documentation created and marked as `APPLIED`
- [ ] All dependencies installed (axios, @tanstack/react-query, react-router-dom, clsx, lucide-react)
- [ ] Vite configured with `/api` proxy to `http://localhost:3000`
- [ ] Axios client created at `src/lib/axios.ts`
- [ ] QueryClientProvider setup in `main.tsx`
- [ ] MainLayout component with Sidebar created
- [ ] Dashboard page created
- [ ] React Router configured in `App.tsx`
- [ ] Build passes (`npm run build`)
- [ ] No linting errors
- [ ] TypeScript compiles without errors

## Testing Requirements

### Unit Tests (Future)
- Layout component rendering
- Sidebar navigation links
- Dashboard page rendering

### E2E Tests (Future)
- Navigation between routes
- Layout persistence across routes

## Related Requirements

- **REQ-0001**: Project Initialization (defines overall architecture)
- **REQ-0002**: Extraction Module (backend API)
- Backend modules: Ingestion, Extraction, Knowledge (API endpoints)

## Implementation Notes

- **Development Proxy**: The Vite proxy allows frontend (port 5173) to make requests to `/api` which are forwarded to backend (port 3000), avoiding CORS issues during development.
- **Production**: In production, the proxy will be handled by the production server (nginx, etc.) or the backend will serve the frontend static files.
- **API Base URL**: Using `/api` allows easy configuration changes between dev (proxy) and production (absolute URL).
- **Feature Structure**: Features are organized by domain (documents, knowledge) following the backend module structure.
- **Shared Components**: Layout and other shared UI components live in `shared/components`.
