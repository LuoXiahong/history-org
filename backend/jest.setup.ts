// Jest setup file - runs before all tests
// Set DATABASE_URL for tests if not already set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test?schema=public';
}
