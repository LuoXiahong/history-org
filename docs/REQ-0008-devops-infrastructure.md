# REQ-0008: DevOps & Infrastructure

| Field | Value |
|-------|-------|
| **Status** | `DRAFT` |
| **Priority** | High |
| **Complexity** | Medium |
| **Estimated Effort** | 4-6 hours |
| **Dependencies** | None |
| **Affects** | Root configuration, CI/CD pipeline |

---

## 1. Overview

This requirement addresses the critical gap in containerization and CI/CD infrastructure. The project currently lacks Docker configuration and automated build/test pipelines, making deployment inconsistent and error-prone.

## 2. Objectives

- Enable consistent development and production environments via Docker
- Automate build, lint, and test workflows via GitHub Actions
- Optimize container builds with multi-stage Dockerfiles
- Reduce image size and build time with proper `.dockerignore` configuration

## 3. Scope

### In Scope
- Backend Dockerfile (multi-stage, production-optimized)
- Frontend Dockerfile (multi-stage, nginx-based)
- `compose.yaml` for local development orchestration
- `.github/workflows/ci.yaml` for CI automation
- `.dockerignore` files for both services

### Out of Scope
- Kubernetes/Helm configurations
- Cloud provider-specific deployment scripts
- Secrets management (Vault, AWS Secrets Manager)
- Production infrastructure provisioning

---

## 4. Technical Specification

### 4.1 Backend Dockerfile

**Location:** `backend/Dockerfile`

```dockerfile
# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci --only=production && \
    npx prisma generate

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npm run build

# ============================================
# Stage 3: Production Runner
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

### 4.2 Frontend Dockerfile

**Location:** `frontend/Dockerfile`

```dockerfile
# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ============================================
# Stage 3: Production Runner (nginx)
# ============================================
FROM nginx:1.25-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Security: Run as non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### 4.3 Frontend Nginx Configuration

**Location:** `frontend/nginx.conf`

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # SPA routing - fallback to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy (optional, for development)
    location /api {
        proxy_pass http://backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4.4 Docker Compose Configuration

**Location:** `compose.yaml`

```yaml
version: '3.9'

services:
  # ============================================
  # PostgreSQL Database
  # ============================================
  database:
    image: postgres:16-alpine
    container_name: history-org-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-historyorg}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-historyorg_secret}
      POSTGRES_DB: ${DB_NAME:-historyorg}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-historyorg} -d ${DB_NAME:-historyorg}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - history-network

  # ============================================
  # NestJS Backend
  # ============================================
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: runner
    container_name: history-org-backend
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      DATABASE_URL: postgresql://${DB_USER:-historyorg}:${DB_PASSWORD:-historyorg_secret}@database:5432/${DB_NAME:-historyorg}?schema=public
      JWT_SECRET: ${JWT_SECRET:-change-me-in-production}
      PORT: 3000
    ports:
      - "${BACKEND_PORT:-3000}:3000"
    depends_on:
      database:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - history-network

  # ============================================
  # React Frontend
  # ============================================
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: runner
      args:
        VITE_API_URL: ${VITE_API_URL:-http://localhost:3000}
    container_name: history-org-frontend
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-8080}:80"
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - history-network

volumes:
  postgres_data:
    driver: local

networks:
  history-network:
    driver: bridge
```

### 4.5 Docker Compose Override (Development)

**Location:** `compose.override.yaml`

```yaml
version: '3.9'

services:
  backend:
    build:
      target: builder
    command: npm run start:dev
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      NODE_ENV: development

  frontend:
    build:
      target: deps
    command: npm run dev -- --host
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "${FRONTEND_DEV_PORT:-5173}:5173"
```

### 4.6 GitHub Actions CI Workflow

**Location:** `.github/workflows/ci.yaml`

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ============================================
  # Backend CI
  # ============================================
  backend-ci:
    name: Backend - Lint, Test, Build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Run Prisma migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test?schema=public

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Unit tests
        run: npm run test:cov
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test?schema=public

      - name: E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test?schema=public

      - name: Build
        run: npm run build

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./backend/coverage/lcov.info
          flags: backend
          fail_ci_if_error: false

  # ============================================
  # Frontend CI
  # ============================================
  frontend-ci:
    name: Frontend - Lint, Test, Build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Unit tests
        run: npm run test:cov

      - name: Build
        run: npm run build
        env:
          VITE_API_URL: http://localhost:3000

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./frontend/coverage/lcov.info
          flags: frontend
          fail_ci_if_error: false

  # ============================================
  # E2E Tests (Playwright)
  # ============================================
  e2e-tests:
    name: E2E Tests (Playwright)
    runs-on: ubuntu-latest
    needs: [backend-ci, frontend-ci]

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install backend dependencies
        working-directory: ./backend
        run: npm ci

      - name: Setup backend
        working-directory: ./backend
        run: |
          npx prisma generate
          npx prisma migrate deploy
          npm run build
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test?schema=public

      - name: Install frontend dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Install Playwright browsers
        working-directory: ./frontend
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        working-directory: ./frontend
        run: npm run test:e2e
        env:
          VITE_API_URL: http://localhost:3000
          DATABASE_URL: postgresql://test:test@localhost:5432/test?schema=public

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 7

  # ============================================
  # Docker Build
  # ============================================
  docker-build:
    name: Docker Build
    runs-on: ubuntu-latest
    needs: [backend-ci, frontend-ci]
    if: github.event_name == 'push'

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build backend image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: false
          tags: history-org-backend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build frontend image
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: false
          tags: history-org-frontend:${{ github.sha }}
          build-args: |
            VITE_API_URL=http://localhost:3000
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### 4.7 Docker Ignore Files

**Location:** `backend/.dockerignore`

```
# Dependencies
node_modules
npm-debug.log*

# Build output
dist

# Test files
coverage
*.spec.ts
*.e2e-spec.ts
__tests__

# IDE
.vscode
.idea
*.swp
*.swo

# Git
.git
.gitignore

# Docs
*.md
docs

# Environment
.env
.env.*
!.env.example

# Docker
Dockerfile*
docker-compose*
compose*
.docker*
```

**Location:** `frontend/.dockerignore`

```
# Dependencies
node_modules
npm-debug.log*

# Build output
dist

# Test files
coverage
*.spec.ts
*.spec.tsx
*.test.ts
*.test.tsx
__tests__
e2e
playwright-report
test-results

# IDE
.vscode
.idea
*.swp
*.swo

# Git
.git
.gitignore

# Docs
*.md
docs

# Environment
.env
.env.*
!.env.example

# Docker
Dockerfile*
docker-compose*
compose*
.docker*

# Storybook
.storybook
storybook-static
```

---

## 5. Acceptance Criteria

- [ ] `docker compose up --build` successfully starts all services
- [ ] Backend container responds to health check at `/health`
- [ ] Frontend container serves the React app on port 80
- [ ] Database container is healthy and accepts connections
- [ ] CI pipeline passes on push to `main` and `develop` branches
- [ ] All tests (unit, integration, e2e) run successfully in CI
- [ ] Docker images are built with multi-stage optimization (< 200MB for backend, < 50MB for frontend)
- [ ] Non-root users are configured in production containers

---

## 6. Testing Strategy

### 6.1 Local Validation
```bash
# Full stack startup
docker compose up --build -d

# Verify health endpoints
curl http://localhost:3000/health
curl http://localhost:8080/

# Verify database connection
docker compose exec backend npx prisma db push

# Cleanup
docker compose down -v
```

### 6.2 CI Validation
- Push to a feature branch
- Verify all CI jobs pass
- Check Codecov coverage reports
- Review Docker build logs for optimization

---

## 7. Rollback Plan

If issues arise:
1. Revert to running services directly with `npm run start`
2. Remove Docker files without affecting application code
3. CI workflow can be disabled by renaming file extension

---

## 8. References

- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [NestJS Docker Documentation](https://docs.nestjs.com/recipes/prisma#docker)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Nginx Docker Best Practices](https://nginx.org/en/docs/)
