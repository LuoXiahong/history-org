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

mkdir -p "$LOG_DIR"

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}Cleaning up servers...${NC}"
  pkill -f "node dist/src/main.js" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
  lsof -ti:3000 -ti:5173 2>/dev/null | xargs -r kill -9 2>/dev/null || true
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

# Build backend if needed
echo -e "${GREEN}[1/5] Building backend...${NC}"
cd "$BACKEND_DIR"
if [ ! -f "dist/src/main.js" ]; then
  npm run build
fi

# Setup database
echo -e "${GREEN}[2/5] Setting up database...${NC}"
DATABASE_URL=file:./e2e-test.db npx prisma db push --accept-data-loss > "$LOG_DIR/db-setup.log" 2>&1

# Start backend
echo -e "${GREEN}[3/5] Starting backend server...${NC}"
cd "$BACKEND_DIR"
DATABASE_URL=file:./e2e-test.db JWT_SECRET=test-secret PORT=3000 node dist/src/main.js > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

# Start frontend
echo -e "${GREEN}[4/5] Starting frontend server...${NC}"
cd "$FRONTEND_DIR"
npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

# Wait for servers to be ready
echo -e "${GREEN}[5/5] Waiting for servers to be ready...${NC}"
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
curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}' > /dev/null 2>&1 || true

echo -e "${GREEN}✓ All servers are ready!${NC}"
echo ""

# Run tests
cd "$FRONTEND_DIR"
echo -e "${GREEN}Running Playwright tests...${NC}"
npx playwright test "$@"
TEST_EXIT_CODE=$?

exit $TEST_EXIT_CODE
