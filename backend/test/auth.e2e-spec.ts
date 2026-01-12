import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';
import * as bcrypt from 'bcrypt';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeEach(async () => {
    // Set required environment variables for tests
    process.env.JWT_SECRET =
      process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
    process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1d';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Setup global prefix
    app.setGlobalPrefix('api/v1');

    // Setup cookie parser and CORS
    app.use(cookieParser());
    app.enableCors({
      origin: 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    await app.init();
  });

  afterEach(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['test@example.com', 'newuser@example.com'],
        },
      },
    });
    await app.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should set httpOnly cookie on successful login', async () => {
      // Create test user
      const hashedPassword = await bcrypt.hash('password123', 12);
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          roles: ['USER'],
          isActive: true,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200);

      expect(response.headers['set-cookie']).toBeDefined();
      const setCookieHeaderRaw: unknown = response.headers['set-cookie'];
      const setCookieHeader = setCookieHeaderRaw as
        | string
        | string[]
        | undefined;
      const cookieHeader = Array.isArray(setCookieHeader)
        ? setCookieHeader[0]
        : String(setCookieHeader);
      expect(cookieHeader).toContain('access_token=');
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('SameSite=Strict');
      const responseBodyRaw: unknown = response.body;
      const responseBody = responseBodyRaw as Record<string, unknown>;
      expect(responseBody).toMatchObject({
        email: 'test@example.com',
        roles: ['USER'],
      });
      expect(typeof responseBody.id).toBe('string');
    });

    it('should authenticate user with cookie in subsequent requests', async () => {
      // Create test user
      const hashedPassword = await bcrypt.hash('password123', 12);
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          roles: ['USER'],
          isActive: true,
        },
      });

      // Login to get cookie
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200);

      const setCookieHeader = loginResponse.headers['set-cookie'];
      const cookies = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : setCookieHeader
          ? [String(setCookieHeader)]
          : [];

      // Use cookie to access protected endpoint
      const meResponse = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(meResponse.body).toMatchObject({
        id: user.id,
        email: 'test@example.com',
        roles: ['USER'],
      });
    });

    it('should reject login with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' })
        .expect(401);

      // Should not set cookie
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should set httpOnly cookie on successful registration', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123',
          name: 'New User',
        })
        .expect(201);

      expect(response.headers['set-cookie']).toBeDefined();
      const setCookieHeaderRaw: unknown = response.headers['set-cookie'];
      const setCookieHeader = setCookieHeaderRaw as
        | string
        | string[]
        | undefined;
      const cookieHeader = Array.isArray(setCookieHeader)
        ? setCookieHeader[0]
        : String(setCookieHeader);
      expect(cookieHeader).toContain('access_token=');
      expect(cookieHeader).toContain('HttpOnly');
      const responseBodyRaw: unknown = response.body;
      const responseBody = responseBodyRaw as Record<string, unknown>;
      expect(responseBody).toMatchObject({
        email: 'newuser@example.com',
        name: 'New User',
        roles: ['USER'],
      });
      expect(typeof responseBody.id).toBe('string');
    });

    it('should reject registration with existing email', async () => {
      // Create existing user
      const hashedPassword = await bcrypt.hash('password123', 12);
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          roles: ['USER'],
          isActive: true,
        },
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123',
        })
        .expect(409);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear access_token cookie on logout', async () => {
      // Create and login user
      const hashedPassword = await bcrypt.hash('password123', 12);
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          roles: ['USER'],
          isActive: true,
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      const setCookieHeader = loginResponse.headers['set-cookie'];
      const cookies = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : setCookieHeader
          ? [String(setCookieHeader)]
          : [];

      // Logout
      const logoutResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookies)
        .expect(204);

      // Cookie should be cleared (maxAge=0 or Expires in past)
      const clearCookieHeaderRaw: unknown =
        logoutResponse.headers['set-cookie'];
      const clearCookieHeader = clearCookieHeaderRaw as
        | string
        | string[]
        | undefined;
      expect(clearCookieHeader).toBeDefined();
      const clearCookieString = Array.isArray(clearCookieHeader)
        ? clearCookieHeader[0]
        : String(clearCookieHeader);
      expect(clearCookieString).toContain('access_token=');
      expect(clearCookieString).toMatch(/Max-Age=0|Expires=/);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should work with cookie authentication', async () => {
      // Create and login user
      const hashedPassword = await bcrypt.hash('password123', 12);
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          roles: ['USER'],
          isActive: true,
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      const cookies = loginResponse.headers['set-cookie'];

      // Access protected endpoint with cookie
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body).toMatchObject({
        id: user.id,
        email: 'test@example.com',
        roles: ['USER'],
      });
    });

    it('should work with Authorization header as fallback', async () => {
      // This test verifies backward compatibility for API clients
      // Create and login user to get token
      const hashedPassword = await bcrypt.hash('password123', 12);
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashedPassword,
          roles: ['USER'],
          isActive: true,
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      // Extract token from cookie (for testing purposes)
      // In real scenario, API client would use Authorization header
      const setCookieHeaderRaw: unknown = loginResponse.headers['set-cookie'];
      const setCookieHeader = setCookieHeaderRaw as
        | string
        | string[]
        | undefined;
      const cookieString = Array.isArray(setCookieHeader)
        ? setCookieHeader[0]
        : String(setCookieHeader);
      const cookieMatch = cookieString.match(/access_token=([^;]+)/);
      const token = cookieMatch ? cookieMatch[1] : null;

      // Access with Authorization header
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: user.id,
        email: 'test@example.com',
        roles: ['USER'],
      });
    });

    it('should reject request without authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });
  });
});
