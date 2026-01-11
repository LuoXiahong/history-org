// Jest setup file - ensure DATABASE_URL uses absolute path for SQLite
const path = require('path');

const testDbPath = path.resolve(__dirname, '..', 'test.db');
process.env.DATABASE_URL = `file:${testDbPath}`;
