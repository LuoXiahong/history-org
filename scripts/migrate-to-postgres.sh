#!/bin/bash
# Migration script to move from SQLite to PostgreSQL

set -e

echo "🚀 Starting PostgreSQL migration..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker and try again."
  exit 1
fi

# Start PostgreSQL
echo "📦 Starting PostgreSQL container..."
docker compose up -d database

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if docker compose exec -T database pg_isready -U historyorg > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready!"
    break
  fi
  attempt=$((attempt + 1))
  sleep 1
done

if [ $attempt -eq $max_attempts ]; then
  echo "❌ PostgreSQL failed to start within $max_attempts seconds"
  exit 1
fi

# Generate new Prisma client
echo "🔧 Generating Prisma client..."
cd backend
npx prisma generate

# Create migration
echo "📝 Creating migration..."
npx prisma migrate dev --name migrate_to_postgres

echo "✅ Migration complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update your .env file with: DATABASE_URL=postgresql://historyorg:historyorg_secret@localhost:5432/historyorg?schema=public"
echo "2. Run 'npm run start:dev' to start the application"
echo "3. Verify the application works correctly"
