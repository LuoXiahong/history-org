#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
LOG_DIR="/tmp/history-org-e2e"
DB_CONTAINER_NAME="history-org-e2e-db"
DB_PORT=5433

# Export DATABASE_URL for all subsequent commands
export DATABASE_URL="postgresql://postgres:test@localhost:$DB_PORT/test?schema=public"
export JWT_SECRET="test-secret"
export PORT=3000

mkdir -p "$LOG_DIR"

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}Cleaning up servers...${NC}"
  pkill -f "node dist/src/main.js" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
  lsof -ti:3000 -ti:5173 2>/dev/null | xargs -r kill -9 2>/dev/null || true
  
  if docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER_NAME}$"; then
    echo "Stopping test database..."
    docker stop "$DB_CONTAINER_NAME" >/dev/null 2>&1 || true
    docker rm "$DB_CONTAINER_NAME" >/dev/null 2>&1 || true
  fi
  
  rm -f /tmp/registration_response.json

  echo -e "${GREEN}Cleanup complete${NC}"
}

trap cleanup EXIT INT TERM

# Clear ports
if lsof -ti:3000 > /dev/null 2>&1; then
  echo -e "${YELLOW}Clearing port 3000...${NC}"
  lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
  sleep 1
fi

if lsof -ti:5173 > /dev/null 2>&1; then
  echo -e "${YELLOW}Clearing port 5173...${NC}"
  lsof -ti:5173 | xargs -r kill -9 2>/dev/null || true
  sleep 1
fi

# Start Test Database
echo -e "${GREEN}[1/6] Starting test database...${NC}"
# Remove if exists
docker rm -f "$DB_CONTAINER_NAME" >/dev/null 2>&1 || true
docker run --name "$DB_CONTAINER_NAME" \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=test \
  -d -p "$DB_PORT:5432" \
  postgres:16-alpine > "$LOG_DIR/db-start.log" 2>&1

# Wait for DB to be ready
echo "Waiting for database to be ready..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if docker exec "$DB_CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Database is ready${NC}"
    break
  fi
  attempt=$((attempt + 1))
  sleep 1
done

if [ $attempt -eq $max_attempts ]; then
  echo -e "${RED}✗ Database failed to start${NC}"
  cat "$LOG_DIR/db-start.log"
  exit 1
fi

# Build backend
echo -e "${GREEN}[2/6] Building backend...${NC}"
cd "$BACKEND_DIR"
npm run build

# Setup database
echo -e "${GREEN}[3/6] Setting up database schema...${NC}"
npx prisma db push --accept-data-loss > "$LOG_DIR/db-setup.log" 2>&1

# Start backend
echo -e "${GREEN}[4/6] Starting backend server...${NC}"
cd "$BACKEND_DIR"
node dist/src/main.js > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

# Start frontend
echo -e "${GREEN}[5/6] Starting frontend server...${NC}"
cd "$FRONTEND_DIR"
npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

# Wait for servers to be ready
echo -e "${GREEN}[6/6] Waiting for servers to be ready...${NC}"
max_attempts=60
attempt=0

# Wait for backend
while [ $attempt -lt $max_attempts ]; do
  if curl -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is ready${NC}"
    break
  fi
  attempt=$((attempt + 1))
  sleep 1
done

if [ $attempt -eq $max_attempts ]; then
  echo -e "${RED}✗ Backend failed to start${NC}"
  echo "Backend logs:"
  cat "$LOG_DIR/backend.log"
  exit 1
fi

# Wait for frontend
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is ready${NC}"
    break
  fi
  attempt=$((attempt + 1))
  sleep 1
done

if [ $attempt -eq $max_attempts ]; then
  echo -e "${RED}✗ Frontend failed to start${NC}"
  echo "Frontend logs:"
  cat "$LOG_DIR/frontend.log"
  exit 1
fi

# Create test user if needed
echo -e "${GREEN}Setting up test user...${NC}"
max_retries=5
retry_count=0
user_created=false

while [ $retry_count -lt $max_retries ]; do
  response=$(curl -s -w "%{http_code}" -o /tmp/registration_response.json -X POST http://localhost:3000/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Password123","name":"Test User"}')
  
  http_code=${response: -3}
  
  if [ "$http_code" -eq 201 ] || [ "$http_code" -eq 409 ]; then
    # 201 Created or 409 Conflict (User already exists)
    echo -e "${GREEN}✓ Test user setup complete (HTTP $http_code)${NC}"
    user_created=true
    break
  else
    echo -e "${YELLOW}Failed to create test user (HTTP $http_code). Retrying in 2s...${NC}"
    cat /tmp/registration_response.json
    echo ""
    sleep 2
    retry_count=$((retry_count + 1))
  fi
done

if [ "$user_created" = false ]; then
  echo -e "${RED}✗ Failed to create test user after $max_retries attempts${NC}"
  exit 1
fi

echo -e "${GREEN}✓ All servers are ready!${NC}"
echo ""

# Run tests
cd "$FRONTEND_DIR"
echo -e "${GREEN}Running Playwright tests...${NC}"
npx playwright test "$@"
TEST_EXIT_CODE=$?

exit $TEST_EXIT_CODE
