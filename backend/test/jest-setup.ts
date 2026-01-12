// Jest setup file - ensure DATABASE_URL uses absolute path for SQLite
import path from 'path';

const testDbPath = path.resolve(__dirname, '..', 'test.db');
process.env.DATABASE_URL = `file:${testDbPath}`;
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRATION = '1d';
