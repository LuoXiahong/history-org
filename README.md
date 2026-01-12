# 📜 History Organizer

[![CI Pipeline](https://github.com/LuoXiahong/history-org/actions/workflows/ci.yaml/badge.svg)](https://github.com/LuoXiahong/history-org/actions/workflows/ci.yaml)
[![Backend Tests](https://github.com/LuoXiahong/history-org/actions/workflows/ci.yaml/badge.svg?branch=main&job=backend-ci)](https://github.com/LuoXiahong/history-org/actions)
[![Frontend Tests](https://github.com/LuoXiahong/history-org/actions/workflows/ci.yaml/badge.svg?branch=main&job=frontend-ci)](https://github.com/LuoXiahong/history-org/actions)
[![Docker Build](https://github.com/LuoXiahong/history-org/actions/workflows/ci.yaml/badge.svg?branch=main&job=docker-build)](https://github.com/LuoXiahong/history-org/actions)

> Personal knowledge management tool for indexing Markdown files and extracting structured historical data (Persons, Events, Dates) using AI.

---

## ✨ Features

- 📁 **Document Ingestion** – Index Markdown files from your local file system
- 🤖 **AI-Powered Extraction** – Extract persons, events, and dates using OpenAI
- 🔍 **Full-Text Search** – Search across all indexed content
- 📅 **Timeline View** – Visualize historical events chronologically
- 👥 **Entity Management** – CRUD operations for persons and events
- 🔗 **Relationship Mapping** – Link persons to events and documents

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | NestJS, CQRS, Prisma, SQLite |
| **Frontend** | React 19, Vite, TailwindCSS, TanStack Query |
| **Testing** | Jest, Vitest, Playwright |
| **Infrastructure** | Docker, GitHub Actions |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (optional)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/LuoXiahong/history-org.git
cd history-org

# Install backend dependencies
cd backend
npm install
npx prisma generate
npx prisma db push
cp .env.example .env

# Start backend (in one terminal)
npm run start:dev

# Install frontend dependencies (in another terminal)
cd ../frontend
npm install

# Start frontend
npm run dev
```

The application will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **API Documentation:** http://localhost:3000/api (Swagger)

---

## 🐳 Docker

### Production Build

```bash
# Build and start all services
docker compose -f compose.yaml up --build -d

# Check health
curl http://localhost:3000/health
curl http://localhost:8080/

# Stop services
docker compose down
```

### Development with Docker

```bash
# Uses compose.override.yaml for hot-reload
docker compose up --build

# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

---

## 🧪 Testing

### Backend

```bash
cd backend

# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Frontend

```bash
cd frontend

# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# E2E tests (Playwright)
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# Type checking
npm run typecheck

# Linting
npm run lint
```

---

## 📁 Project Structure

```
history-org/
├── backend/                # NestJS Backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── ingestion/    # Document indexing
│   │   │   ├── extraction/   # AI entity extraction
│   │   │   └── knowledge/    # Search & queries
│   │   └── shared/           # Shared infrastructure
│   ├── prisma/               # Database schema
│   └── test/                 # E2E tests
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── features/         # Feature modules
│   │   └── shared/           # Shared components
│   └── e2e/                  # Playwright tests
├── docs/                   # Requirements & documentation
└── compose.yaml            # Docker Compose config
```

---

## 🔧 Configuration

### Environment Variables

#### Backend (`backend/.env`)

```env
# Database
DATABASE_URL=file:./data/history.db

# OpenAI (for AI extraction features)
OPENAI_API_KEY=sk-your-key-here

# Server
PORT=3000
```

#### Frontend

```env
VITE_API_URL=http://localhost:3000
```

---

## 📖 API Documentation

The backend exposes a Swagger UI for API documentation:

```
http://localhost:3000/api
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ingestion/documents` | Index a document |
| `POST` | `/ingestion/upload` | Upload and index a file |
| `GET` | `/knowledge/search` | Search all entities |
| `GET` | `/knowledge/timeline` | Get timeline events |
| `GET` | `/knowledge/persons/:id` | Get person details |
| `GET` | `/knowledge/events/:id` | Get event details |
| `POST` | `/knowledge/enrich-person` | AI-enrich person data |

---

## 🏗️ Architecture

The backend follows **CQRS (Command Query Responsibility Segregation)** pattern:

```
┌─────────────────┐
│  Markdown Files │  (Source of Truth)
└────────┬────────┘
         │
┌────────▼───────────────────────────────────┐
│            NestJS Backend (CQRS)           │
│  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Commands   │  │      Queries        │  │
│  │  (Write)    │  │      (Read)         │  │
│  └─────────────┘  └─────────────────────┘  │
└────────┬───────────────────────────────────┘
         │
┌────────▼────────┐
│   SQLite DB     │  (Metadata & Extracted Data)
└─────────────────┘
```

---

## 🤝 Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Ensure all tests pass
4. Submit a pull request

---

## 📄 License

This project is private and unlicensed.
