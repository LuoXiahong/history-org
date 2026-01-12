// Jest setup file - ensure DATABASE_URL is set for PostgreSQL
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://test:test@localhost:5432/test?schema=public';
}
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRATION = '1d';
