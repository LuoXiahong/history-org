# History Organizer – Frontend

[![Frontend CI](https://github.com/LuoXiahong/history-org/actions/workflows/ci.yaml/badge.svg?branch=main&job=frontend-ci)](https://github.com/LuoXiahong/history-org/actions)

React frontend for the History Organizer application.

## Tech Stack

- **Framework:** React 19
- **Build Tool:** Vite 7
- **Styling:** TailwindCSS 4
- **State Management:** TanStack Query
- **Routing:** React Router 7
- **Testing:** Vitest + Playwright

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run test` | Run unit tests |
| `npm run test:cov` | Run tests with coverage |
| `npm run test:e2e` | Run Playwright tests |
| `npm run test:e2e:ui` | Run Playwright with UI |
| `npm run lint` | Lint code |
| `npm run typecheck` | Type checking |

## Project Structure

```
src/
├── features/           # Feature modules
│   ├── documents/      # Document management
│   ├── timeline/       # Timeline visualization
│   └── search/         # Search functionality
├── shared/
│   ├── components/     # Shared UI components
│   ├── hooks/          # Custom hooks
│   └── api/            # API client
└── main.tsx
```

## Configuration

Environment variables (`.env`):

```env
VITE_API_URL=http://localhost:3000
```

## Testing

```bash
# Unit tests (Vitest)
npm run test

# E2E tests (Playwright)
npm run test:e2e
```
