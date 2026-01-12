# REQ-0015: PostgreSQL Migration

| Field | Value |
|-------|-------|
| **Status** | `TODO` |
| **Priority** | High |
| **Complexity** | Medium |
| **Estimated Effort** | 3-4 hours |
| **Dependencies** | REQ-0008 (DevOps) |
| **Affects** | Prisma schema, Docker Compose, CI pipeline |

---

## 1. Overview

**Current Issue:** SQLite is used for the database, which:
- Doesn't support array types (roles stored as JSON string)
- Lacks full-text search capabilities
- Not production-ready for multi-user scenarios
- Doesn't match production environment

**Solution:** Migrate to PostgreSQL for feature parity with production.

## 2. Objectives

- Replace SQLite with PostgreSQL in development and CI
- Update Prisma schema to use PostgreSQL-specific features
- Configure PostgreSQL in Docker Compose
- Update CI pipeline to use PostgreSQL service
- Enable array types for roles

## 3. Technical Specification

### 3.1 Prisma Schema Updates

```prisma
// backend/prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

enum UserRole {
  USER
  ADMIN
  MODERATOR
}

model User {
  id          String     @id @default(uuid())
  email       String     @unique
  password    String
  name        String?
  roles       UserRole[] @default([USER]) // Native array support!
  isActive    Boolean    @default(true)
  lastLoginAt DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@map("users")
}

// Rest of schema remains the same...
```

### 3.2 Docker Compose Update

```yaml
# compose.yaml
services:
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
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-historyorg}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### 3.3 Development Override

```yaml
# compose.override.yaml
services:
  database:
    ports:
      - "5432:5432"
```

### 3.4 Environment Files

```env
# backend/.env.development
DATABASE_URL="postgresql://historyorg:historyorg_secret@localhost:5432/historyorg?schema=public"

# backend/.env.test
DATABASE_URL="postgresql://test:test@localhost:5432/historyorg_test?schema=public"
```

### 3.5 CI Pipeline Update

```yaml
# .github/workflows/ci.yaml
jobs:
  backend-ci:
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
      # ...
      - name: Run Prisma migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test?schema=public
```

### 3.6 Migration Script

```bash
#!/bin/bash
# scripts/migrate-to-postgres.sh

echo "Starting PostgreSQL migration..."

# Start PostgreSQL
docker compose up -d database

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
sleep 5

# Generate new Prisma client
cd backend
npx prisma generate

# Create migration
npx prisma migrate dev --name migrate_to_postgres

echo "Migration complete!"
```

## 4. Acceptance Criteria

- [ ] Prisma schema uses `provider = "postgresql"`
- [ ] User.roles uses native `UserRole[]` array type
- [ ] Docker Compose includes PostgreSQL service with healthcheck
- [ ] CI pipeline uses PostgreSQL service container
- [ ] `DATABASE_URL` points to PostgreSQL in all environments
- [ ] Existing data migration plan documented (if needed)
- [ ] All tests pass with PostgreSQL

## 5. Testing Strategy

### Database Connection Test

```typescript
describe('PrismaService', () => {
  it('should connect to PostgreSQL', async () => {
    const prisma = new PrismaService();
    await expect(prisma.$connect()).resolves.not.toThrow();
  });
});
```

### Array Type Test

```typescript
describe('User roles', () => {
  it('should store roles as array', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashed',
        roles: ['USER', 'ADMIN'],
      },
    });
    
    expect(user.roles).toEqual(['USER', 'ADMIN']);
    expect(Array.isArray(user.roles)).toBe(true);
  });
});
```

## 6. Migration Steps

1. **Backup current SQLite data** (if any)
2. **Update Prisma schema** to PostgreSQL
3. **Start PostgreSQL** via Docker Compose
4. **Run Prisma migrations**
5. **Update environment variables**
6. **Update CI pipeline**
7. **Test all functionality**
8. **Remove SQLite files** from repository

## 7. Rollback Plan

1. Revert Prisma schema to SQLite
2. Restore SQLite database file
3. Run `npx prisma generate`
4. Restart application

## 8. References

- [Prisma PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
