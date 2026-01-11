// Jest setup file - runs before all tests
// Set DATABASE_URL for tests if not already set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./test.db';
}
