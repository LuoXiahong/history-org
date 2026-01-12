# Requirements Status Overview

Last updated: 2026-01-12

## Status Legend

| Status | Description |
|--------|-------------|
| `DONE` | Fully implemented and tested |
| `APPLIED` | Work started, partially implemented |
| `TODO` | Not started |
| `DRAFT` | Documented but needs review |

---

## Completed Requirements

### REQ-0013: Frontend Architecture Improvements ✅ DONE
- Error boundaries implemented
- Code splitting with React.lazy
- Toast notifications (sonner)
- Loading/skeleton components

---

## Partially Completed Requirements

### REQ-0001: Project Initialization (APPLIED)
**Completed:**
- [x] NestJS backend initialized
- [x] React + Vite frontend initialized
- [x] Prisma schema defined
- [x] CQRS module structure created
- [x] Basic module architecture

**Remaining:**
- [ ] TypeScript strict mode verification
- [ ] Update status to DONE after review

---

### REQ-0002: Extraction Module (APPLIED)
**Completed:**
- [x] OpenAI package installed
- [x] ExtractionModule created
- [x] OpenAIExtractorService implemented
- [x] Uses `response_format: { type: 'json_object' }`

**Remaining:**
- [ ] ExtractEntitiesCommand handler tests
- [ ] DocumentIndexedHandler integration
- [ ] EntitiesExtractedEvent implementation
- [ ] Error handling for API failures
- [ ] Retry logic with exponential backoff

---

### REQ-0003: Knowledge Module (APPLIED)
**Completed:**
- [x] KnowledgeModule structure
- [x] GetPerson, GetEvent queries
- [x] SearchEverything query
- [x] GetTimeline query
- [x] Controller endpoints
- [x] CRUD commands for Persons/Events

**Remaining:**
- [ ] Full test coverage for handlers
- [ ] Swagger documentation complete
- [ ] Pagination optimization

---

### REQ-0004: Frontend Foundation (APPLIED)
**Completed:**
- [x] Dependencies installed (axios, tanstack-query, react-router)
- [x] Vite proxy configured
- [x] Axios client with interceptors
- [x] QueryClientProvider setup
- [x] MainLayout with Sidebar
- [x] Dashboard page

**Remaining:**
- [ ] Dark mode preparation
- [ ] Responsive design polish

---

### REQ-0005: Frontend Features - Upload & Search (APPLIED)
**Completed:**
- [x] UploadPage with FileDropzone
- [x] SearchPage with debounced search
- [x] PersonCard component
- [x] EventCard component
- [x] Backend upload endpoint

**Remaining:**
- [ ] Upload progress indicator
- [ ] Unit tests for components
- [ ] E2E tests for flows

---

### REQ-0006: Frontend Timeline (APPLIED)
**Completed:**
- [x] TimelinePage component
- [x] TimelineList with year grouping
- [x] TimelineItem component
- [x] API integration
- [x] Date filters

**Remaining:**
- [ ] Responsive mobile layout
- [ ] Unit tests
- [ ] E2E tests

---

### REQ-0007: Manual Entity Management (APPLIED)
**Completed:**
- [x] Person CRUD commands
- [x] Event CRUD commands
- [x] Deduplication logic
- [x] AI enrichment endpoint
- [x] Controller endpoints

**Remaining:**
- [ ] PeoplePage data table
- [ ] EventsPage data table
- [ ] PersonForm with AI auto-fill
- [ ] Edit functionality in details pages
- [ ] Sidebar navigation update

---

### REQ-0008: DevOps & Infrastructure (APPLIED)
**Completed:**
- [x] CI pipeline (.github/workflows/ci.yaml)
- [x] Linting, testing, building in CI
- [x] Playwright E2E in CI
- [x] Docker build verification
- [x] compose.yaml exists

**Remaining:**
- [ ] PostgreSQL in compose.yaml (currently SQLite)
- [ ] Backend Dockerfile multi-stage
- [ ] Frontend Dockerfile with nginx
- [ ] Health checks in containers
- [ ] Non-root user in containers

---

### REQ-0010: Auth & Security (APPLIED)
**Completed:**
- [x] AuthModule created
- [x] JWT strategy with Passport
- [x] Login/Register endpoints
- [x] JwtAuthGuard
- [x] RolesGuard
- [x] @Public(), @Roles(), @CurrentUser() decorators
- [x] Password hashing with bcrypt
- [x] Frontend AuthContext

**Remaining:**
- [ ] **CRITICAL:** Move JWT from localStorage to httpOnly cookies (see REQ-0014)
- [ ] Token refresh mechanism
- [ ] Full test coverage

---

## Not Started Requirements

### REQ-0009: Backend Core Configuration (TODO)
**Current State:** Basic `main.ts` with minimal configuration
**Required:**
- [ ] Helmet middleware
- [ ] CORS explicit configuration
- [ ] Global ValidationPipe
- [ ] Swagger/OpenAPI setup
- [ ] API versioning
- [ ] Graceful shutdown

---

### REQ-0011: Observability & Health (TODO)
**Required:**
- [ ] HealthModule with @nestjs/terminus
- [ ] Database health indicator
- [ ] Memory health indicator
- [ ] /health, /health/live, /health/ready endpoints
- [ ] Structured logging with nestjs-pino
- [ ] Prometheus metrics endpoint
- [ ] Correlation ID middleware

---

### REQ-0012: Resilience & Error Handling (TODO)
**Required:**
- [ ] Global AllExceptionsFilter
- [ ] Standardized error response format
- [ ] Domain exception hierarchy
- [ ] Rate limiting with @nestjs/throttler
- [ ] Request timeout interceptor
- [ ] Production error message hiding

---

### REQ-0014: Secure Token Storage (TODO) ⚠️ SECURITY
**Required:**
- [ ] Move JWT to httpOnly cookies
- [ ] Update backend to set cookies
- [ ] Update frontend to use credentials
- [ ] Add cookie-parser middleware
- [ ] CSRF considerations

---

### REQ-0015: PostgreSQL Migration (TODO)
**Required:**
- [ ] Update Prisma schema to PostgreSQL
- [ ] Native array types for roles
- [ ] PostgreSQL in Docker Compose
- [ ] Update CI pipeline
- [ ] Migration script

---

### REQ-0016: Enhanced DTO Validation (TODO)
**Required:**
- [ ] Global ValidationPipe configuration
- [ ] Validation decorators on all DTOs
- [ ] Swagger documentation on DTOs
- [ ] Remove manual validation from handlers
- [ ] Custom validators (IsBefore, etc.)

---

### REQ-0017: Integration Test Suite (TODO)
**Required:**
- [ ] Full flow test: Upload → Extract → Timeline
- [ ] Mocked OpenAI service
- [ ] Duplicate detection test
- [ ] Error handling test
- [ ] CRUD on extracted entities test
- [ ] CI integration

---

## Priority Order for Completion

### Critical (Security/Production)
1. **REQ-0014** - Secure Token Storage (XSS vulnerability)
2. **REQ-0015** - PostgreSQL Migration (production readiness)
3. **REQ-0009** - Backend Core Configuration (security hardening)

### High (Quality/Reliability)
4. **REQ-0012** - Resilience & Error Handling
5. **REQ-0016** - Enhanced DTO Validation
6. **REQ-0011** - Observability & Health

### Medium (Features/Testing)
7. **REQ-0017** - Integration Test Suite
8. **REQ-0007** - Complete frontend pages
9. **REQ-0008** - Complete Docker setup

### Low (Polish)
10. Remaining items from applied requirements

---

## Metrics

| Category | Count |
|----------|-------|
| Total Requirements | 17 |
| Completed | 1 |
| Partially Completed | 9 |
| Not Started | 7 |
| **Completion %** | ~30% |
