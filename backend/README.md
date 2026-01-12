# History Organizer – Backend

[![Backend CI](https://github.com/LuoXiahong/history-org/actions/workflows/ci.yaml/badge.svg?branch=main&job=backend-ci)](https://github.com/LuoXiahong/history-org/actions)

NestJS backend with CQRS architecture for the History Organizer application.

## Tech Stack

- **Framework:** NestJS 11
- **Architecture:** CQRS (Command Query Responsibility Segregation)
- **Database:** SQLite via Prisma ORM
- **AI Integration:** OpenAI API
- **Documentation:** Swagger/OpenAPI
- **Testing:** Jest

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Start development server
npm run start:dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Build for production |
| `npm run test` | Run unit tests |
| `npm run test:cov` | Run tests with coverage |
| `npm run test:e2e` | Run E2E tests |
| `npm run lint` | Lint code |
| `npm run typecheck` | Type checking |

## Project Structure

```
src/
├── modules/
│   ├── ingestion/      # Document indexing
│   │   ├── commands/
│   │   ├── queries/
│   │   └── events/
│   ├── extraction/     # AI entity extraction
│   │   ├── commands/
│   │   └── domain/
│   └── knowledge/      # Search & entity management
│       ├── commands/
│       ├── queries/
│       └── dto/
├── shared/
│   └── infrastructure/
│       ├── database/   # Prisma module
│       └── file-system/
└── main.ts
```

## Configuration

Create a `.env` file:

```env
DATABASE_URL=postgresql://historyorg:historyorg_secret@localhost:5432/historyorg?schema=public
OPENAI_API_KEY=sk-your-key-here
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=1d
CORS_ORIGINS=http://localhost:5173
```

## API Documentation

Swagger UI available at: `http://localhost:3000/api`
